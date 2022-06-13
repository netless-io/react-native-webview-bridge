"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bridge = void 0;
require("react-native-get-random-values");
const webview_bridge_1 = require("@netless/webview-bridge");
const uuid_1 = require("uuid");
class Bridge {
    constructor() {
        this.webview = undefined;
        this.methods = new Map();
        this.queue = new Map();
        this.isReady = false;
        this.pendingAction = [];
    }
    bind(webview) {
        this.webview = webview;
    }
    ready() {
        this.isReady = this.webview != undefined;
        if (!this.isReady) {
            return;
        }
        this.pendingAction.forEach(action => {
            action();
        });
    }
    call(method, ...args) {
        if (!this.isReady) {
            this.pendingAction.push(() => {
                this.call(method, ...args);
            });
            return;
        }
        const actionId = (0, uuid_1.v4)();
        const message = webview_bridge_1.RNCommon.bridgeMessageTemplate(webview_bridge_1.RNCommon.BridgeEventType.req, actionId, method, args);
        this.queue.set(actionId, { ack: false });
        this.webview.postMessage(message);
        return actionId;
    }
    callAsync(method, ...args) {
        if (!this.isReady) {
            this.pendingAction.push(() => {
                this.callAsync(method, ...args);
            });
        }
        ;
        return new Promise((resolve, reject) => {
            const actionId = (0, uuid_1.v4)();
            const message = webview_bridge_1.RNCommon.bridgeMessageTemplate(webview_bridge_1.RNCommon.BridgeEventType.req, actionId, method, args);
            this.queue.set(actionId, { ack: false, resolve: resolve, reject: reject });
            this.webview.postMessage(message);
        });
    }
    register(name, fun) {
        this.methods.set(name, fun);
    }
    recv(protocol) {
        if (typeof protocol === 'string') {
            const { type, actionId, method, payload } = webview_bridge_1.RNCommon.parseBridgeMessage(protocol);
            switch (type) {
                case webview_bridge_1.RNCommon.BridgeEventType.ack:
                    if (this.queue.has(actionId)) {
                        const q = this.queue.get(actionId);
                        q.ack = true;
                        const ackPayload = payload;
                        if (q.resolve) {
                            if (method === webview_bridge_1.RNCommon.ackTypeError) {
                                q.reject(payload);
                            }
                            else {
                                q.resolve(ackPayload.data);
                            }
                            if (ackPayload.complete) {
                                this.queue.delete(actionId);
                            }
                        }
                        else {
                            q.ret = method;
                            this.queue.set(actionId, q);
                        }
                    }
                    break;
                case webview_bridge_1.RNCommon.BridgeEventType.evt:
                    if (this.methods.has(method)) {
                        let fun = this.methods.get(method);
                        if (!fun) {
                            const names = method.split(".");
                            if (names.length < 2) {
                                console.log(`method ${method} not found`);
                                return;
                            }
                            const namespaceMethod = names.pop();
                            const namespace = names.join(".");
                            if (this.methods.has(namespace)) {
                                fun = this.methods.get(namespace)[namespaceMethod];
                            }
                            else {
                                console.log(`namespace ${namespace} not found`);
                                return;
                            }
                        }
                        try {
                            const ret = fun.apply(payload);
                            const protocolForAck = webview_bridge_1.RNCommon.bridgeMessageTemplate(webview_bridge_1.RNCommon.BridgeEventType.ack, actionId, webview_bridge_1.RNCommon.ackTypeSuccess, ret);
                            this.webview.postMessage(protocolForAck);
                        }
                        catch (e) {
                            const protocolForAck = webview_bridge_1.RNCommon.bridgeMessageTemplate(webview_bridge_1.RNCommon.BridgeEventType.ack, actionId, webview_bridge_1.RNCommon.ackTypeError, e);
                            this.webview.postMessage(protocolForAck);
                        }
                    }
                    break;
            }
        }
    }
}
exports.bridge = new Bridge();
