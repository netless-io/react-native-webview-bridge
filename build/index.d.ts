import WebView from 'react-native-webview';
import 'react-native-get-random-values';
declare class Bridge {
    private webview;
    private methods;
    private queue;
    private isReady;
    private pendingAction;
    bind(webview: WebView): void;
    ready(): void;
    call(method: string, ...args: any): string | undefined;
    callAsync(method: string, ...args: any): Promise<any>;
    register(name: string, fun: any): void;
    recv(protocol: string): void;
}
export declare const bridge: Bridge;
export {};
