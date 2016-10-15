'use babel';

import $ from 'jquery';

export default class UsernameView {
    constructor() {
        var usernameViewTemplate = `
        <div>
            <p>pick a username:</p>
            <atom-text-editor class="username-box editor mini" tabindex="-1" data-grammar="text plain null-grammar" mini="" data-encoding="utf8"></atom-text-editor>
        </div>
        `
        this.$usernameView = $(usernameViewTemplate);
    }

    getElement() {
        return this.$usernameView;
    }
}
