/**
 * Simple string request from user
 * opts: { validator?: (string) => boolean }
 */
export function requestString(state, prompt, opts = {}) {
    return {type: "string", prompt, state, ...opts};
}

/**
 * Request choice from buttons
 * options: { key: label }
 * opts: { allowCustom?: boolean, validator?: fn }
 */
export function requestChoice(state, options, prompt = null, opts = {}) {
    return {type: "choice", options, prompt, state, ...opts};
}

export function requestDate(state, prompt = null) {
    return {type: "date", prompt, state};
}

export function response(state, text, extra = null) {
    return {type: "response", text, state, extra};
}

export function responseMarkdown(state, text, extra = null) {
    return {type: "response_markdown", text, state, extra};
}

export function cancelled(state, text = null) {
    return {type: "cancel", text, state};
}