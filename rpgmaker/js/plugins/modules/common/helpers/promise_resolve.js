export class PromiseResolve {

    constructor() {
        // empty
    }

    /**
     * 
     * @param {Function} resolve 
     * @param {Function} reject 
     */
    setResolve(resolve, reject) {
        this._resolve = resolve;
        this._reject = reject;
    }

    /**
     * 
     * @param {any} [value] 
     */
    resolve(value) {
        if (this._resolve) {
            this._resolve(value);
            this._clear();
        }
    }

    /**
     * 
     * @param {any} [reason] 
     */
    reject(reason = 'Rejected correctly, this is not an error') {
        if (this._reject) {
            this._reject(reason);
            this._clear();
        }
    }

    _clear() {
        this._resolve = null;
        this._reject = null;
    }

}