/*
 * Copyright 2021 Comcast Cable Communications Management, LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

// NOTE: this test SHOULD NOT include Setup, since it does it's own
// setup for Firebolt SDK/TL handshake
const win = globalThis || window

import { Lifecycle, Discovery } from '../../dist/firebolt.js'

// holds test transport layer state, e.g. callback
const state = {

}

let navigateToListenCount = 0
let pullEntityInfoListenCount = 0
let callbackWiredUp = false
let sendCalled = false

const transport = {
    send: function(message) {
        sendCalled = true
        const json = JSON.parse(message)
        if (json.method.toLowerCase() === 'discovery.onnavigateto') {
            // we'll assert on this later...
            navigateToListenCount++
            if (state.callback) {
                // we'll assert on this later...
                callbackWiredUp = true
                let response = {
                    jsonrpc: '2.0',
                    id: json.id,
                    result: true
                }
                // catching errors, so all tests don't fail if this breaks
                try {
                    // send back the onInactive event immediately, to test for race conditions
                    state.callback(JSON.stringify(response))
                }
                catch (err) {
                    // fail silenetly (the boolean-based tests below will figure it out...)
                }
            }
        }
        else if (json.method.toLowerCase() === 'discovery.onpullentityinfo') {
            pullEntityInfoListenCount++
        }
    },
    receive: function(callback) {
        // store the callback
        state.callback = callback
    }
}

// listen twice, using event-specific call FIRST
Discovery.listen("navigateTo", (value) => { callbackWiredUp = true })
Discovery.listen("navigateTo", (value) => { /* this just adds more listen calls to make sure we don't spam */ })
Discovery.listen((event, value) => { /* testing both listen signatures */ })
Discovery.listen((event, value) => { /* testing both listen signatures */ })
// listen three more times, using wildcard FIRST (from above)
Discovery.listen("pullEntityInfo", (value) => {  })
Discovery.listen("pullEntityInfo", (value) => {  })
Discovery.listen("pullEntityInfo", (value) => {  })

Lifecycle.ready()

win.__firebolt.setTransportLayer(transport)

test('Transport injected after SDK', () => {
    expect(callbackWiredUp).toBe(true)
});

test('Transport send method working', () => {
    expect(sendCalled).toBe(true)
});

test('Transport was sent listeners', () => {
    expect(navigateToListenCount).toBeGreaterThan(0)
    expect(pullEntityInfoListenCount).toBeGreaterThan(0)
});

test('Transport was sent each listener only once', () => {
    expect(navigateToListenCount).toBe(1)
    expect(pullEntityInfoListenCount).toBe(1)
});
