/**
 * Custom exceptions for flow control
 */

/**
 * Exception thrown when flow should be interrupted due to menu change
 */
export class FlowInterruptedException extends Error {
    constructor(message = 'Flow interrupted') {
        super(message);
        this.name = 'FlowInterruptedException';
    }
}
