/* ==========================================================================
   scenes.js - data for the "I am a ___ and I need to ___" selector.
   Every scene is a real mini Owlet moment: real file names, real code with
   syntax tokens, a real rendered preview and real console lines. Nothing in
   here claims a feature that does not work today.

   Shape:
     roles: [{
       id: 'student', label: 'Student',
       tasks: [{
         id: 'fix-js', label: 'fix a JavaScript error',
         steps: [ 'One concrete instruction per step (3 max).' ],
         scene: { ...OwletMock scene (see js/mock.js)... }
       }]
     }]

   To add a scene: copy an existing task block, give it a new id, write the
   code tokens ({ t: 'text', c: 'kw|str|tag|num|cm|fn|pl' }), preview nodes and
   console rows. The selector picks it up automatically.
   ========================================================================== */

window.OwletLanding = window.OwletLanding || {};

window.OwletLanding.scenes = {
    roles: [
        /* ======================= STUDENT ======================= */
        {
            id: 'student',
            label: 'Student',
            tasks: [
                {
                    id: 'fix-js',
                    label: 'fix a JavaScript error',
                    steps: [
                        'Open the project and read the red line in the console panel.',
                        'Declare `user` above the line that uses it, then press Ctrl+S.',
                        'The error clears and the preview shows the greeting.'
                    ],
                    scene: {
                        files: ['index.html', 'app.js'],
                        activeFile: 'app.js',
                        layout: 'editor+console',
                        ariaLabel: 'Owlet editor with a ReferenceError in the console, then fixed',
                        code: [
                            { tokens: [{ t: '// greet.js', c: 'cm' }] },
                            { tokens: [{ t: '' }] },
                            { tokens: [{ t: 'console', c: 'fn' }, { t: '.log(user.name);', c: 'pl' }] },
                            { tokens: [{ t: '' }] },
                            { tokens: [{ t: '// why does it say', c: 'cm' }] },
                            { tokens: [{ t: '// user is not defined?', c: 'cm' }] }
                        ],
                        errorLine: 3,
                        console: [
                            { level: 'error', text: 'ReferenceError: user is not defined (app.js:3)' }
                        ],
                        annotation: { target: 'console', text: 'Errors show the file and line.' },
                        steps: [
                            { do: 'type', at: 1, delayMs: 700, tokens: [{ t: 'const', c: 'kw' }, { t: ' user = { name: ', c: 'pl' }, { t: '"Sara"', c: 'str' }, { t: ' };', c: 'pl' }] },
                            { do: 'unerror', delayMs: 600 },
                            { do: 'log', level: 'log', text: 'Sara', delayMs: 500 }
                        ]
                    }
                },
                {
                    id: 'style-page',
                    label: 'style my first page',
                    steps: [
                        'Open style.css and add a rule for .card.',
                        'Change the color or padding and press Ctrl+S.',
                        'The preview restyles the moment you save.'
                    ],
                    scene: {
                        files: ['index.html', 'style.css'],
                        activeFile: 'style.css',
                        layout: 'editor+preview',
                        code: [
                            { tokens: [{ t: '.card', c: 'kw' }, { t: ' {', c: 'pl' }] },
                            { tokens: [{ t: '  padding', c: 'tag' }, { t: ': ', c: 'pl' }, { t: '16px', c: 'num' }, { t: ';', c: 'pl' }] },
                            { tokens: [{ t: '  border-radius', c: 'tag' }, { t: ': ', c: 'pl' }, { t: '10px', c: 'num' }, { t: ';', c: 'pl' }] },
                            { tokens: [{ t: '  background', c: 'tag' }, { t: ': ', c: 'pl' }, { t: '#eef0f5', c: 'num' }, { t: ';', c: 'pl' }] },
                            { tokens: [{ t: '}', c: 'pl' }] }
                        ],
                        preview: {
                            device: 'desktop',
                            nodes: [
                                { tag: 'div', cls: 'pv-card', children: [
                                    { tag: 'h2', text: 'My first page' },
                                    { tag: 'p', text: 'This card follows style.css as I edit it.' }
                                ]}
                            ]
                        },
                        previewAfter: {
                            nodes: [
                                { tag: 'div', cls: 'pv-card', style: { background: '#e8d9f3' }, children: [
                                    { tag: 'h2', text: 'My first page' },
                                    { tag: 'p', text: 'Lavender background — saved and live.' }
                                ]}
                            ]
                        },
                        steps: [
                            { do: 'type', at: 4, delayMs: 800, tokens: [{ t: '  background', c: 'tag' }, { t: ': ', c: 'pl' }, { t: '#e8d9f3', c: 'num' }, { t: ';', c: 'pl' }] },
                            { do: 'preview', delayMs: 700 }
                        ],
                        annotation: { target: 'preview', text: 'Edits appear on save — no refresh needed.' }
                    }
                },
                {
                    id: 'live-preview',
                    label: 'practise with a live preview',
                    steps: [
                        'Edit the text inside the <h1> in index.html.',
                        'Watch the preview update as you type.',
                        'Press Ctrl+B to hide the explorer for more room.'
                    ],
                    scene: {
                        files: ['index.html', 'style.css'],
                        activeFile: 'index.html',
                        layout: 'editor+preview',
                        code: [
                            { tokens: [{ t: '<main>', c: 'tag' }] },
                            { tokens: [{ t: '  <h1>', c: 'tag' }, { t: 'About me', c: 'pl' }, { t: '</h1>', c: 'tag' }] },
                            { tokens: [{ t: '  <p>', c: 'tag' }, { t: 'I am learning HTML.', c: 'pl' }, { t: '</p>', c: 'tag' }] },
                            { tokens: [{ t: '</main>', c: 'tag' }] }
                        ],
                        preview: {
                            device: 'desktop',
                            nodes: [
                                { tag: 'h1', text: 'About me' },
                                { tag: 'p', text: 'I am learning HTML.' }
                            ]
                        },
                        previewAfter: {
                            nodes: [
                                { tag: 'h1', text: 'About Sara' },
                                { tag: 'p', text: 'I am learning HTML.' }
                            ]
                        },
                        steps: [
                            { do: 'preview', delayMs: 1600 }
                        ],
                        annotation: { target: 'preview', text: 'The preview follows your cursor as you type.' }
                    }
                }
            ]
        },

        /* ==================== FRONTEND DEV ==================== */
        {
            id: 'frontend',
            label: 'Frontend dev',
            tasks: [
                {
                    id: 'responsive',
                    label: 'test responsive layouts',
                    steps: [
                        'Keep the preview open next to the editor.',
                        'Use the device buttons in the preview toolbar to flip to phone.',
                        'Fix the overflow you spot and switch back to desktop.'
                    ],
                    scene: {
                        files: ['index.html', 'style.css'],
                        activeFile: 'index.html',
                        layout: 'editor+preview',
                        code: [
                            { tokens: [{ t: '<nav', c: 'tag' }, { t: ' class', c: 'attr' }, { t: '=', c: 'pl' }, { t: '"menu"', c: 'str' }, { t: '>', c: 'tag' }] },
                            { tokens: [{ t: '  <a>', c: 'tag' }, { t: 'Work', c: 'pl' }, { t: '</a>', c: 'tag' }] },
                            { tokens: [{ t: '  <a>', c: 'tag' }, { t: 'About', c: 'pl' }, { t: '</a>', c: 'tag' }] },
                            { tokens: [{ t: '  <a>', c: 'tag' }, { t: 'Contact', c: 'pl' }, { t: '</a>', c: 'tag' }] },
                            { tokens: [{ t: '</nav>', c: 'tag' }] }
                        ],
                        preview: {
                            device: 'desktop',
                            nodes: [
                                { tag: 'div', cls: 'pv-row', children: [
                                    { tag: 'a', text: 'Work' }, { tag: 'a', text: 'About' }, { tag: 'a', text: 'Contact' }
                                ]}
                            ]
                        },
                        steps: [
                            { do: 'device', device: 'phone', delayMs: 1400 }
                        ],
                        annotation: { target: 'preview', text: 'Device presets: desktop, tablet, phone.' }
                    }
                },
                {
                    id: 'side-by-side',
                    label: 'open HTML and CSS as tabs',
                    steps: [
                        'Open style.css as a second tab next to index.html.',
                        'Keep the selector name identical in both files.',
                        'Press Ctrl+S — both files save at once.'
                    ],
                    scene: {
                        files: ['index.html', 'style.css'],
                        activeFile: 'index.html',
                        layout: 'editor+preview',
                        code: [
                            { tokens: [{ t: '<section', c: 'tag' }, { t: ' class', c: 'attr' }, { t: '=', c: 'pl' }, { t: '"hero"', c: 'str' }, { t: '>', c: 'tag' }] },
                            { tokens: [{ t: '  <h1>', c: 'tag' }, { t: 'Portfolio', c: 'pl' }, { t: '</h1>', c: 'tag' }] },
                            { tokens: [{ t: '  <p>', c: 'tag' }, { t: 'Recent work', c: 'pl' }, { t: '</p>', c: 'tag' }] },
                            { tokens: [{ t: '</section>', c: 'tag' }] }
                        ],
                        code2: [
                            { tokens: [{ t: '.hero', c: 'kw' }, { t: ' {', c: 'pl' }] },
                            { tokens: [{ t: '  display', c: 'tag' }, { t: ': ', c: 'pl' }, { t: 'grid', c: 'num' }, { t: ';', c: 'pl' }] },
                            { tokens: [{ t: '  gap', c: 'tag' }, { t: ': ', c: 'pl' }, { t: '24px', c: 'num' }, { t: ';', c: 'pl' }] },
                            { tokens: [{ t: '  padding', c: 'tag' }, { t: ': ', c: 'pl' }, { t: '48px', c: 'num' }, { t: ';', c: 'pl' }] },
                            { tokens: [{ t: '}', c: 'pl' }] }
                        ],
                        annotation: { target: 'editor', text: 'Two files, one project.' }
                    }
                },
                {
                    id: 'console-errors',
                    label: 'check console errors fast',
                    steps: [
                        'Open the bottom panel with Ctrl+J to see console output.',
                        'Read the error — it names the file and line.',
                        'Fix the typo in the selector and run again.'
                    ],
                    scene: {
                        files: ['index.html', 'app.js'],
                        activeFile: 'app.js',
                        layout: 'editor+console',
                        code: [
                            { tokens: [{ t: 'const', c: 'kw' }, { t: ' btn = ', c: 'pl' }, { t: 'document', c: 'fn' }] },
                            { tokens: [{ t: '  .querySelector(', c: 'pl' }, { t: '"#sumbit"', c: 'str' }, { t: ');', c: 'pl' }] },
                            { tokens: [{ t: 'btn.', c: 'pl' }, { t: 'addEventListener', c: 'fn' }, { t: '(', c: 'pl' }, { t: '"click"', c: 'str' }, { t: ', send);', c: 'pl' }] }
                        ],
                        errorLine: 3,
                        console: [
                            { level: 'error', text: "TypeError: Cannot read 'addEventListener' of null (app.js:3)" },
                            { level: 'log', text: 'hint: "#sumbit" is not in index.html — did you mean "#submit"?' }
                        ],
                        steps: [
                            { do: 'type', at: 3, delayMs: 700, tokens: [{ t: '// fixed: #submit', c: 'cm' }] },
                            { do: 'unerror', delayMs: 700 },
                            { do: 'log', level: 'log', text: 'listener attached — button works', delayMs: 500 }
                        ],
                        annotation: { target: 'console', text: 'Ctrl+J toggles this panel in the app.' }
                    }
                }
            ]
        },

        /* ======================= DESIGNER ======================= */
        {
            id: 'designer',
            label: 'Designer',
            tasks: [
                {
                    id: 'spacing',
                    label: 'try spacing and themes',
                    steps: [
                        'Open style.css and change the gap and padding values.',
                        'Use the theme toggle in the top bar to check dark mode.',
                        'Both themes follow the same tokens — no extra work.'
                    ],
                    scene: {
                        files: ['index.html', 'style.css'],
                        activeFile: 'style.css',
                        layout: 'editor+preview',
                        code: [
                            { tokens: [{ t: '.gallery', c: 'kw' }, { t: ' {', c: 'pl' }] },
                            { tokens: [{ t: '  display', c: 'tag' }, { t: ': ', c: 'pl' }, { t: 'grid', c: 'num' }, { t: ';', c: 'pl' }] },
                            { tokens: [{ t: '  gap', c: 'tag' }, { t: ': ', c: 'pl' }, { t: '8px', c: 'num' }, { t: ';', c: 'pl' }] },
                            { tokens: [{ t: '}', c: 'pl' }] }
                        ],
                        preview: {
                            device: 'desktop',
                            nodes: [
                                { tag: 'div', cls: 'pv-row', style: { gap: '4px' }, children: [
                                    { tag: 'span', cls: 'pv-box', style: { width: '34px', height: '26px', background: '#cfe2d1' } },
                                    { tag: 'span', cls: 'pv-box', style: { width: '34px', height: '26px', background: '#f7d2bb' } },
                                    { tag: 'span', cls: 'pv-box', style: { width: '34px', height: '26px', background: '#d9d0f1' } }
                                ]}
                            ]
                        },
                        previewAfter: {
                            nodes: [
                                { tag: 'div', cls: 'pv-row', style: { gap: '14px' }, children: [
                                    { tag: 'span', cls: 'pv-box', style: { width: '34px', height: '26px', background: '#cfe2d1' } },
                                    { tag: 'span', cls: 'pv-box', style: { width: '34px', height: '26px', background: '#f7d2bb' } },
                                    { tag: 'span', cls: 'pv-box', style: { width: '34px', height: '26px', background: '#d9d0f1' } }
                                ]}
                            ]
                        },
                        steps: [
                            { do: 'preview', delayMs: 1500 }
                        ],
                        annotation: { target: 'preview', text: 'gap: 8px → 24px, live.' }
                    }
                },
                {
                    id: 'device-check',
                    label: 'preview on phone and tablet',
                    steps: [
                        'Click the tablet preset in the preview toolbar.',
                        'Then the phone preset — the frame resizes for each.',
                        'Note what wraps, then adjust the CSS.'
                    ],
                    scene: {
                        files: ['index.html', 'style.css'],
                        activeFile: 'index.html',
                        layout: 'editor+preview',
                        code: [
                            { tokens: [{ t: '<header', c: 'tag' }, { t: ' class', c: 'attr' }, { t: '=', c: 'pl' }, { t: '"hero"', c: 'str' }, { t: '>', c: 'tag' }] },
                            { tokens: [{ t: '  <h1>', c: 'tag' }, { t: 'Studio North', c: 'pl' }, { t: '</h1>', c: 'tag' }] },
                            { tokens: [{ t: '  <p>', c: 'tag' }, { t: 'Design for small screens first.', c: 'pl' }, { t: '</p>', c: 'tag' }] },
                            { tokens: [{ t: '</header>', c: 'tag' }] }
                        ],
                        preview: {
                            device: 'desktop',
                            nodes: [
                                { tag: 'h1', text: 'Studio North' },
                                { tag: 'p', text: 'Design for small screens first.' },
                                { tag: 'span', cls: 'pv-btn', text: 'See work' }
                            ]
                        },
                        steps: [
                            { do: 'device', device: 'tablet', delayMs: 1100 },
                            { do: 'device', device: 'phone', delayMs: 1400 }
                        ],
                        annotation: { target: 'preview', text: 'Desktop → tablet → phone, one click each.' }
                    }
                },
                {
                    id: 'handoff',
                    label: 'hand off a clean prototype',
                    steps: [
                        'Build the layout in index.html and style.css.',
                        'Use File → Share to export the project as a ZIP.',
                        'Hand it over — it opens in any browser, no setup.'
                    ],
                    scene: {
                        files: ['index.html', 'style.css', 'README.md'],
                        activeFile: 'index.html',
                        layout: 'editor+preview',
                        code: [
                            { tokens: [{ t: '<main', c: 'tag' }, { t: ' class', c: 'attr' }, { t: '=', c: 'pl' }, { t: '"pricing"', c: 'str' }, { t: '>', c: 'tag' }] },
                            { tokens: [{ t: '  <h1>', c: 'tag' }, { t: 'Pricing', c: 'pl' }, { t: '</h1>', c: 'tag' }] },
                            { tokens: [{ t: '  <ul>', c: 'tag' }] },
                            { tokens: [{ t: '    <li>', c: 'tag' }, { t: 'Free', c: 'pl' }, { t: '</li>', c: 'tag' }] },
                            { tokens: [{ t: '    <li>', c: 'tag' }, { t: 'Pro', c: 'pl' }, { t: '</li>', c: 'tag' }] },
                            { tokens: [{ t: '  </ul>', c: 'tag' }] },
                            { tokens: [{ t: '</main>', c: 'tag' }] }
                        ],
                        preview: {
                            device: 'desktop',
                            nodes: [
                                { tag: 'h1', text: 'Pricing' },
                                { tag: 'div', cls: 'pv-card', children: [{ tag: 'p', text: 'Free — 1 project' }] },
                                { tag: 'div', cls: 'pv-card', children: [{ tag: 'p', text: 'Pro — unlimited' }] }
                            ]
                        },
                        annotation: { target: 'preview', text: 'Share exports a ZIP — open it anywhere.' }
                    }
                }
            ]
        },

        /* ======================= TEACHER ======================= */
        {
            id: 'teacher',
            label: 'Teacher',
            tasks: [
                {
                    id: 'share-lesson',
                    label: 'share a ready lesson',
                    steps: [
                        'Prepare index.html and style.css with the exercise.',
                        'Use File → Share to send students a copy or ZIP.',
                        'Each student edits their own copy — nothing breaks yours.'
                    ],
                    scene: {
                        files: ['index.html', 'style.css', 'exercise.js'],
                        activeFile: 'index.html',
                        layout: 'editor+preview',
                        code: [
                            { tokens: [{ t: '<h1>', c: 'tag' }, { t: 'Lesson 4: Flexbox', c: 'pl' }, { t: '</h1>', c: 'tag' }] },
                            { tokens: [{ t: '<p>', c: 'tag' }, { t: 'Task: centre the box.', c: 'pl' }, { t: '</p>', c: 'tag' }] },
                            { tokens: [{ t: '<div', c: 'tag' }, { t: ' class', c: 'attr' }, { t: '=', c: 'pl' }, { t: '"box"', c: 'str' }, { t: '>', c: 'tag' }, { t: '</div>', c: 'tag' }] }
                        ],
                        preview: {
                            device: 'desktop',
                            nodes: [
                                { tag: 'h1', text: 'Lesson 4: Flexbox' },
                                { tag: 'p', text: 'Task: centre the box.' },
                                { tag: 'span', cls: 'pv-box', style: { display: 'block', width: '40px', height: '40px', background: '#ff8a4c' } }
                            ]
                        },
                        annotation: { target: 'tree', text: 'One folder = one lesson.' }
                    }
                },
                {
                    id: 'live-demo',
                    label: 'demo live while teaching',
                    steps: [
                        'Keep the code and preview visible at the same time.',
                        'Type slowly — the preview updates for the class to see.',
                        'Ask students to predict each change before you save.'
                    ],
                    scene: {
                        files: ['index.html', 'style.css'],
                        activeFile: 'style.css',
                        layout: 'editor+preview',
                        code: [
                            { tokens: [{ t: '.box', c: 'kw' }, { t: ' {', c: 'pl' }] },
                            { tokens: [{ t: '  width', c: 'tag' }, { t: ': ', c: 'pl' }, { t: '40px', c: 'num' }, { t: ';', c: 'pl' }] },
                            { tokens: [{ t: '  height', c: 'tag' }, { t: ': ', c: 'pl' }, { t: '40px', c: 'num' }, { t: ';', c: 'pl' }] },
                            { tokens: [{ t: '  margin', c: 'tag' }, { t: ': ', c: 'pl' }, { t: '0', c: 'num' }, { t: ';', c: 'pl' }] },
                            { tokens: [{ t: '}', c: 'pl' }] }
                        ],
                        preview: {
                            device: 'desktop',
                            nodes: [
                                { tag: 'span', cls: 'pv-box', style: { display: 'block', width: '40px', height: '40px', background: '#ff8a4c' } }
                            ]
                        },
                        previewAfter: {
                            nodes: [
                                { tag: 'div', style: { display: 'flex', justifyContent: 'center' }, children: [
                                    { tag: 'span', cls: 'pv-box', style: { display: 'block', width: '40px', height: '40px', background: '#ff8a4c' } }
                                ]}
                            ]
                        },
                        steps: [
                            { do: 'type', at: 4, delayMs: 800, tokens: [{ t: '  margin', c: 'tag' }, { t: ': ', c: 'pl' }, { t: 'auto', c: 'kw' }, { t: ';', c: 'pl' }] },
                            { do: 'preview', delayMs: 700 }
                        ],
                        annotation: { target: 'preview', text: 'margin: auto — the class sees it centre.' }
                    }
                },
                {
                    id: 'student-copy',
                    label: 'let students edit a copy',
                    steps: [
                        'Students open Owlet — no account, no install.',
                        'They open the lesson folder or the shared copy.',
                        'Their edits stay in their own browser.'
                    ],
                    scene: {
                        files: ['index.html', 'style.css', 'notes.js'],
                        activeFile: 'notes.js',
                        layout: 'editor+console',
                        code: [
                            { tokens: [{ t: '// exercise: make it log 42', c: 'cm' }] },
                            { tokens: [{ t: 'const', c: 'kw' }, { t: ' answer = ', c: 'pl' }, { t: '6 * 7', c: 'num' }, { t: ';', c: 'pl' }] },
                            { tokens: [{ t: 'console', c: 'fn' }, { t: '.log(answer);', c: 'pl' }] }
                        ],
                        console: [
                            { level: 'log', text: '42' }
                        ],
                        annotation: { target: 'console', text: 'Every student edits their own copy.' }
                    }
                }
            ]
        },

        /* ======================= HOBBYIST ======================= */
        {
            id: 'hobbyist',
            label: 'Hobbyist',
            tasks: [
                {
                    id: 'offline-idea',
                    label: 'prototype an idea offline',
                    steps: [
                        'Open Owlet once — it stays available offline after that.',
                        'Sketch the idea in index.html on the train, in the park, anywhere.',
                        'It is there next time you open it — autosaved in the browser.'
                    ],
                    scene: {
                        files: ['index.html', 'app.js'],
                        activeFile: 'index.html',
                        layout: 'editor+preview',
                        code: [
                            { tokens: [{ t: '<h1>', c: 'tag' }, { t: 'Recipe box', c: 'pl' }, { t: '</h1>', c: 'tag' }] },
                            { tokens: [{ t: '<ul>', c: 'tag' }] },
                            { tokens: [{ t: '  <li>', c: 'tag' }, { t: 'Pasta', c: 'pl' }, { t: '</li>', c: 'tag' }] },
                            { tokens: [{ t: '  <li>', c: 'tag' }, { t: 'Curry', c: 'pl' }, { t: '</li>', c: 'tag' }] },
                            { tokens: [{ t: '</ul>', c: 'tag' }] }
                        ],
                        preview: {
                            device: 'desktop',
                            nodes: [
                                { tag: 'h1', text: 'Recipe box' },
                                { tag: 'p', text: '• Pasta   • Curry' }
                            ]
                        },
                        annotation: { target: 'preview', text: 'Works offline after the first load.' }
                    }
                },
                {
                    id: 'local-files',
                    label: 'keep projects on my device',
                    steps: [
                        'Use File → Open folder to work on real files on disk.',
                        'Edits save straight into that folder with Ctrl+S.',
                        'Nothing is uploaded — close the tab, files stay put.'
                    ],
                    scene: {
                        files: ['index.html', 'style.css', 'app.js'],
                        activeFile: 'index.html',
                        layout: 'editor+preview',
                        code: [
                            { tokens: [{ t: '<h1>', c: 'tag' }, { t: 'My bike log', c: 'pl' }, { t: '</h1>', c: 'tag' }] },
                            { tokens: [{ t: '<p>', c: 'tag' }, { t: '12 rides this month.', c: 'pl' }, { t: '</p>', c: 'tag' }] }
                        ],
                        preview: {
                            device: 'desktop',
                            nodes: [
                                { tag: 'h1', text: 'My bike log' },
                                { tag: 'p', text: '12 rides this month.' }
                            ]
                        },
                        annotation: { target: 'tree', text: 'A real folder on your device.' }
                    }
                },
                {
                    id: 'no-install',
                    label: 'experiment without installing',
                    steps: [
                        'Open the link and start typing — that is the whole setup.',
                        'Break things freely; Delete line is Ctrl+D, undo is Ctrl+Z.',
                        'When it works, Share exports a ZIP you keep.'
                    ],
                    scene: {
                        files: ['index.html', 'app.js'],
                        activeFile: 'app.js',
                        layout: 'editor+console',
                        code: [
                            { tokens: [{ t: '// what does this do?', c: 'cm' }] },
                            { tokens: [{ t: 'const', c: 'kw' }, { t: ' xs = [', c: 'pl' }, { t: '1, 2, 3', c: 'num' }, { t: '];', c: 'pl' }] },
                            { tokens: [{ t: 'console', c: 'fn' }, { t: '.log(xs.map(x => x * x));', c: 'pl' }] }
                        ],
                        console: [
                            { level: 'log', text: '[1, 4, 9]' }
                        ],
                        annotation: { target: 'console', text: 'Try it, read the output, change it.' }
                    }
                }
            ]
        },

        /* ===================== CONTRIBUTOR ===================== */
        {
            id: 'contributor',
            label: 'Contributor',
            tasks: [
                {
                    id: 'first-change',
                    label: 'make my first change',
                    steps: [
                        'Clone the repo — the stepper below has the command.',
                        'Open index.html in your browser: no build step.',
                        'Edit css/tokens.css, reload, and your change is live.'
                    ],
                    scene: {
                        files: ['index.html', 'tokens.css', 'main.js'],
                        activeFile: 'tokens.css',
                        layout: 'editor+preview',
                        code: [
                            { tokens: [{ t: ':root', c: 'kw' }, { t: ' {', c: 'pl' }] },
                            { tokens: [{ t: '  --accent', c: 'tag' }, { t: ': ', c: 'pl' }, { t: '#ff8a4c', c: 'num' }, { t: ';', c: 'pl' }] },
                            { tokens: [{ t: '  --radius-md', c: 'tag' }, { t: ': ', c: 'pl' }, { t: '16px', c: 'num' }, { t: ';', c: 'pl' }] },
                            { tokens: [{ t: '}', c: 'pl' }] }
                        ],
                        preview: {
                            device: 'desktop',
                            nodes: [
                                { tag: 'h1', text: 'Owlet' },
                                { tag: 'span', cls: 'pv-btn', text: 'Accent follows --accent' }
                            ]
                        },
                        annotation: { target: 'tree', text: 'Plain HTML/CSS/JS — no build step.' }
                    }
                },
                {
                    id: 'run-locally',
                    label: 'run the project locally',
                    steps: [
                        'git clone the repository, then open index.html.',
                        'Everything works from file:// — no server needed.',
                        'Optional: python -m http.server for a local URL.'
                    ],
                    scene: {
                        files: ['index.html', 'app.js', 'sw.js'],
                        activeFile: 'index.html',
                        layout: 'editor+preview',
                        code: [
                            { tokens: [{ t: '<link', c: 'tag' }, { t: ' rel', c: 'attr' }, { t: '=', c: 'pl' }, { t: '"stylesheet"', c: 'str' }] },
                            { tokens: [{ t: '  href', c: 'attr' }, { t: '=', c: 'pl' }, { t: '"css/tokens.css"', c: 'str' }, { t: '>', c: 'tag' }] },
                            { tokens: [{ t: '<script', c: 'tag' }, { t: ' src', c: 'attr' }, { t: '=', c: 'pl' }, { t: '"js/app.js"', c: 'str' }, { t: '>', c: 'tag' }] }
                        ],
                        preview: {
                            device: 'desktop',
                            nodes: [
                                { tag: 'h1', text: 'Owlet — local copy' },
                                { tag: 'p', text: 'Running straight from the cloned files.' }
                            ]
                        },
                        annotation: { target: 'preview', text: 'file:// works — open index.html.' }
                    }
                },
                {
                    id: 'first-issue',
                    label: 'find a good first issue',
                    steps: [
                        'Check the "Good first issues" link in the contribute section.',
                        'Pick one, then read CONTRIBUTING.md for the workflow.',
                        'Fork, change, test in the browser, open the PR.'
                    ],
                    scene: {
                        files: ['CONTRIBUTING.md', 'index.html'],
                        activeFile: 'CONTRIBUTING.md',
                        layout: 'editor+preview',
                        code: [
                            { tokens: [{ t: '# Contributing', c: 'kw' }] },
                            { tokens: [{ t: '' }] },
                            { tokens: [{ t: '1. Fork the repository', c: 'pl' }] },
                            { tokens: [{ t: '2. Open index.html in a browser', c: 'pl' }] },
                            { tokens: [{ t: '3. Keep PRs small and described', c: 'pl' }] }
                        ],
                        preview: {
                            device: 'desktop',
                            nodes: [
                                { tag: 'h2', text: 'Good first issue?' },
                                { tag: 'p', text: 'Small scope, clear acceptance, reviewed fast.' }
                            ]
                        },
                        annotation: { target: 'tree', text: 'The guide ships in the repo.' }
                    }
                }
            ]
        }
    ],

    /* ---------- day-timeline slides (9AM → 5PM) ---------- */
    /* One scene per showcase slide; layouts vary so no two slides look alike. */
    showcase: [
        {
            // 9AM — first file, first render.
            files: ['index.html', 'style.css'],
            activeFile: 'index.html',
            layout: 'editor+preview',
            ariaLabel: 'Owlet editor writing a first page with a live preview',
            code: [
                { tokens: [{ t: '<main>', c: 'tag' }] },
                { tokens: [{ t: '  <h1>', c: 'tag' }, { t: 'Hello, Owlet', c: 'pl' }, { t: '</h1>', c: 'tag' }] },
                { tokens: [{ t: '  <p>', c: 'tag' }, { t: 'My first page, live.', c: 'pl' }, { t: '</p>', c: 'tag' }] },
                { tokens: [{ t: '</main>', c: 'tag' }] }
            ],
            preview: {
                device: 'desktop',
                nodes: [
                    { tag: 'h1', text: 'Hello, Owlet' },
                    { tag: 'p', text: 'My first page, live.' }
                ]
            },
            steps: [
                { do: 'type', at: 4, delayMs: 900, tokens: [{ t: '<button>', c: 'tag' }, { t: 'Try it', c: 'pl' }, { t: '</button>', c: 'tag' }] }
            ],
            annotation: { target: 'preview', text: 'The preview updates as you type.' }
        },
        {
            // 11AM — console catches the failure, one fix clears it.
            files: ['index.html', 'app.js'],
            activeFile: 'app.js',
            layout: 'editor+console',
            ariaLabel: 'Owlet console showing a TypeError that gets fixed',
            code: [
                { tokens: [{ t: 'const', c: 'kw' }, { t: ' price = ', c: 'pl' }, { t: 'cart', c: 'fn' }, { t: '.total;', c: 'pl' }] },
                { tokens: [{ t: 'console', c: 'fn' }, { t: '.log(price);', c: 'pl' }] }
            ],
            errorLine: 1,
            console: [
                { level: 'error', text: "TypeError: Cannot read 'total' of undefined (app.js:1)" }
            ],
            steps: [
                { do: 'type', at: 0, delayMs: 700, tokens: [{ t: 'const', c: 'kw' }, { t: ' cart = { total: ', c: 'pl' }, { t: '42', c: 'num' }, { t: ' };', c: 'pl' }] },
                { do: 'unerror', delayMs: 700 },
                { do: 'log', level: 'log', text: '42', delayMs: 500 }
            ],
            annotation: { target: 'console', text: 'Errors point at the file and line.' }
        },
        {
            // 1PM — the same page at three device widths.
            files: ['index.html', 'style.css'],
            activeFile: 'style.css',
            layout: 'editor+preview',
            ariaLabel: 'Owlet preview switching from desktop to phone width',
            code: [
                { tokens: [{ t: '.nav', c: 'kw' }, { t: ' {', c: 'pl' }] },
                { tokens: [{ t: '  display', c: 'tag' }, { t: ': ', c: 'pl' }, { t: 'flex', c: 'num' }, { t: ';', c: 'pl' }] },
                { tokens: [{ t: '  gap', c: 'tag' }, { t: ': ', c: 'pl' }, { t: '24px', c: 'num' }, { t: ';', c: 'pl' }] },
                { tokens: [{ t: '}', c: 'pl' }] }
            ],
            preview: {
                device: 'desktop',
                nodes: [
                    { tag: 'div', cls: 'pv-row', style: { gap: '12px' }, children: [
                        { tag: 'a', text: 'Work' }, { tag: 'a', text: 'About' }, { tag: 'a', text: 'Contact' }
                    ]},
                    { tag: 'h2', text: 'Recent projects' }
                ]
            },
            steps: [
                { do: 'device', device: 'tablet', delayMs: 1200 },
                { do: 'device', device: 'phone', delayMs: 1400 }
            ],
            annotation: { target: 'preview', text: 'Device presets in the preview bar.' }
        },
        {
            // 5PM — markup and styles side by side.
            files: ['index.html', 'style.css'],
            activeFile: 'index.html',
            layout: 'editor+preview',
            ariaLabel: 'Owlet with HTML and CSS open as tabs',
            code: [
                { tokens: [{ t: '<article', c: 'tag' }, { t: ' class', c: 'attr' }, { t: '=', c: 'pl' }, { t: '"card"', c: 'str' }, { t: '>', c: 'tag' }] },
                { tokens: [{ t: '  <h2>', c: 'tag' }, { t: 'Day one', c: 'pl' }, { t: '</h2>', c: 'tag' }] },
                { tokens: [{ t: '  <p>', c: 'tag' }, { t: 'Shipped the page.', c: 'pl' }, { t: '</p>', c: 'tag' }] },
                { tokens: [{ t: '</article>', c: 'tag' }] }
            ],
            code2: [
                { tokens: [{ t: '.card', c: 'kw' }, { t: ' {', c: 'pl' }] },
                { tokens: [{ t: '  padding', c: 'tag' }, { t: ': ', c: 'pl' }, { t: '20px', c: 'num' }, { t: ';', c: 'pl' }] },
                { tokens: [{ t: '  border-radius', c: 'tag' }, { t: ': ', c: 'pl' }, { t: '12px', c: 'num' }, { t: ';', c: 'pl' }] },
                { tokens: [{ t: '}', c: 'pl' }] }
            ],
            annotation: { target: 'editor', text: 'Two tabs: HTML and CSS.' }
        }
    ]
};
