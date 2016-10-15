'use babel';

import $ from 'jquery';

export default class SessionIdView {
    constructor() {
        var sessionIdViewTemplate = `
        <div>
            <p>Input the Session ID:</p>
            <atom-text-editor class="session-id-box editor mini" tabindex="-1" data-grammar="text plain null-grammar" mini="" data-encoding="utf8"></atom-text-editor>
        </div>
        `
        this.$sessionIdView = $(sessionIdViewTemplate);
    }

    getElement() {
        return this.$sessionIdView;
    }
}
