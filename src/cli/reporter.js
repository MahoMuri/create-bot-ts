"use strict";

const { createSpinner } = require("nanospinner");

/** Failure of a single scaffold step, wrapping the original error as `cause`. */
class StepError extends Error {
    constructor(label, cause) {
        super(`Failed to ${label.toLowerCase()}`, { cause });
        this.name = "StepError";
    }
}

/**
 * Spinner-bound progress reporter.
 *
 * `step()` keeps the spinner label in sync with the task that is running and
 * rethrows failures as {@link StepError}, so `main` can report the real error
 * once and exit non-zero instead of dying inside a callback.
 */
const createReporter = (
    text = "Creating template! Do not exit the process...",
) => {
    const spinner = createSpinner(text).start({ color: "green" });

    const step = async (label, color, fn) => {
        spinner.update({ text: label, color });
        try {
            return await fn();
        } catch (cause) {
            spinner.error({
                text: `Failed to ${label.toLowerCase()}`,
                color: "red",
            });
            throw new StepError(label, cause);
        }
    };

    const success = (message) => spinner.success({ text: message });

    return { step, success };
};

module.exports = { createReporter, StepError };
