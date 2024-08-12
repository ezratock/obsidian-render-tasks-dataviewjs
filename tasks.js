
// let NOTE_PATH = "testytestytesty";
// let RENDER_LEN = 1;
// let RENDER_INDEX = 1;
// let INDENT = 0;

// if "set done date on every completed task" is enabled in the Tasks plugin. Hardcoded to default YYYY-MM-DD
const COMPLETE_ENABLED = true;
const VALID_PRIORITIES = ['🔺', '⏫', '🔼', '🔽', '⏬️', ''];

const linesCache = {};

await renderFile(NOTE_PATH, RENDER_LEN, RENDER_INDEX, INDENT);

async function renderFile(notePath, renderLen, renderIndex, indent, masterClickedOverride = false) {
    // find full path of NOTE_PATH
    notePath = dv.page(notePath).file.path;

    let prioritiesShown = splitArray(VALID_PRIORITIES, renderLen)[renderIndex-1];
    const page = dv.page(notePath);
    if (page) {
        const masterClicked = getMasterClicked(notePath, renderIndex) || masterClickedOverride;
        let clickListener = (e) => {
            setMasterClicked(notePath, renderIndex, e.target.checked);
            update();
        }
        const name = `<a href="${notePath}" class="internal-link">${page.file.name}</a>`;
        const containers = renderTask(name, indent, clickListener, masterClicked, masterClicked);
        containers.taskContainer.appendChild(containers.textContainer);
        dv.container.appendChild(containers.taskContainer);
        await renderTasks(notePath, page.file.tasks, prioritiesShown, indent + 1, masterClicked);
    } else {
        let clickListener = (e) => {

        }
        renderTask(`ERROR: FILE \"${NOTE_PATH}\" NOT FOUND`, indent, clickListener, false);
        containers.taskContainer.appendChild(containers.textContainer);
        dv.container.appendChild(containers.taskContainer);
        pageNotFoundError(notePath);
    }
}

function splitArray(array, n) {
    if (n < 1 || n > 3) {
        throw new Error('Invalid number of parts');
    }

    // Calculate the size of each part
    const partSize = Math.ceil(array.length / n);
    const result = [];

    for (let i = 0; i < n; i++) {
        const start = i * partSize;
        const end = Math.min(start + partSize, array.length);
        result.push(array.slice(start, end));
    }

    return result;
}

function update() {
    // Throws strange error.
    //
    // Uncaught RangeError: Trying to find position for a DOM position outside of the document
    //     at t.posFromDOM (app.js:1:360144)
    //     at e.posAtDOM (app.js:1:452533)
    //     at Dh.handleClickEvent (plugin:obsidian-tasks-plugin:315:277)
    dv.container.innerHTML = '';
    renderFile(NOTE_PATH, RENDER_LEN, RENDER_INDEX, INDENT);
}

function getKey(notePath, renderIndex) {
    const renderNotePath = dv.page(NOTE_PATH).file.path;
    return dv.current().file.path + ":" + NOTE_PATH + ":" + renderIndex + (notePath === renderNotePath && renderIndex === RENDER_INDEX ? "" : ":" + renderNotePath + ":" + RENDER_INDEX);
}

function setMasterClicked(notePath, renderIndex, clicked) {
    const fileCache = JSON.parse(localStorage.getItem('masterClickedCache')) || {};

    fileCache[getKey(notePath, renderIndex)] = clicked;

    localStorage.setItem('masterClickedCache', JSON.stringify(fileCache));
}

function getMasterClicked(notePath, renderIndex) {
    const fileCache = JSON.parse(localStorage.getItem('masterClickedCache')) || {};

    return fileCache[getKey(notePath, renderIndex)] || false;
}

async function getLines(notePath) {
    if (linesCache[notePath]) {
        return linesCache[notePath];
    }
    const file = app.vault.getAbstractFileByPath(notePath);
    if (!file) {
        //TODO: BETTER ERROR CHECKING
        console.error("ERROR: file " + file + " not found when reading lines");
        return null;
    }
    const content = await app.vault.read(file);
    let lines = content.split('\n');
    linesCache[notePath] = lines;

    return lines;
}

// Function to render tasks with indentation
async function renderTasks(notePath, tasks, acceptedPriorities, extraIndent, masterClicked, prevLine = 0, indentLevel = 0) {
    let lines = await getLines(notePath);
    for (const task of tasks) {
        if (!(task.parent && indentLevel === 0)) {
            const linesToCheck = lines.slice(prevLine, task.line);
            const textToCheck = linesToCheck.join('\n');
            const renderRegex = /```dataviewjs\nlet\sNOTE_PATH\s*=\s*"([^;\n"']+)"\s*;?\s*\nlet\sRENDER_LEN\s*=\s*(\d+)\s*;?\s*\nlet\sRENDER_INDEX\s*=\s*(\d+)\s*;?\s*\nlet\sINDENT\s*=\s*(\d+)\s*;?\s*\n(?:[\s\S]*?)\n```/;
            const match = textToCheck.match(renderRegex);
            if (match) {
                await renderFile(match[1], parseInt(match[2], 10), parseInt(match[3], 10), parseInt(match[4], 10) + extraIndent, masterClicked);
            }
            prevLine = task.line;
            if (hasPriorityChild(task, acceptedPriorities) || await hasPriorityParent(notePath, task, acceptedPriorities)) {
                const clickListener = (e) => {
                    const parse = parseTask("- [ ] " + task.text)
                    updateTask(notePath, task, null, e.target.checked, parse.priority, parse.startDate, parse.dueDate);
                };
                const containers = renderTask(task.text, indentLevel + extraIndent, clickListener, task.completed, masterClicked);

                const editButton = document.createElement('span');
                editButton.textContent = '📝';
                editButton.style.cursor = 'pointer';
                editButton.style.marginLeft = '4px';
                editButton.style.userSelect = 'none';

                editButton.addEventListener('click', () => {
                    createInputDialog(notePath, task);
                });
                containers.textContainer.appendChild(editButton);

                containers.taskContainer.appendChild(containers.textContainer);

                // Append the task container to the main container
                dv.container.appendChild(containers.taskContainer);
                //wrapper.appendChild(taskContainer);
            }

            // Recursively render subtasks with increased indentation
            if (task.subtasks) {
                await renderTasks(notePath, task.subtasks, acceptedPriorities, extraIndent, masterClicked, prevLine, indentLevel + 1);
            }
        }
    }
}

function renderTask(text, indent, clickListener, completed, masterClicked=false) {
    // Create a container for the task elements
    const taskContainer = document.createElement('div');
    taskContainer.style.display = 'flex'; // Use flexbox layout
    taskContainer.style.position = 'relative';
    taskContainer.style.alignItems = 'flex-start';

    // Create an indentation prefix based on the task level
    const indentSpan = document.createElement('span');
    //indentSpan.innerHTML = '&nbsp;'.repeat(((indentLevel + extraIndent) * 8) + 2); // Adjust the multiplier for more/less space
    indentSpan.style.paddingLeft = `${(indent) * 36 + 7.3}px`;
    indentSpan.style.flex = '0 0 auto'; // Prevent flex item from growing/shrinking
    taskContainer.appendChild(indentSpan);

    for (let i = 0; i < indent; i++) {
        const lineDiv = document.createElement('div');
        lineDiv.style.position = 'absolute'; // Position absolutely within the container
        lineDiv.style.left = `${14.5 + i * 36.1}px`; // Position the line based on the index
        lineDiv.style.top = '0'; // Start at the top of the container
        lineDiv.style.bottom = '0'; // Extend to the bottom of the container
        lineDiv.style.width = '0.5px'; // Width of the vertical line
        lineDiv.style.backgroundColor = '#393939'; // Color of the vertical line
        lineDiv.style.marginRight = '4px'; // Space between lines
        taskContainer.appendChild(lineDiv);
    }

    // Create and append the checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = completed;
    checkbox.addEventListener('click', clickListener);
    checkbox.style.marginTop = '4px';
    taskContainer.appendChild(checkbox);

    const textContainer = document.createElement('div');

    // Create and append the label with indentation
    const label = document.createElement('label');
    label.innerHTML = parseTaskText(text);
    if (checkbox.checked || masterClicked) {
        label.style.textDecoration = 'line-through';
        label.style.color = '#aaa';
    }

    textContainer.appendChild(label);

    return {textContainer, taskContainer};
}

// Function to parse task text and convert links
function parseTaskText(text) {
    text = text.split('\n')[0];

    // Replace Obsidian-style internal links [[link]]
    const internalLinkPattern = /\[\[([^\]]+)\]\]/g;
    text = text.replace(internalLinkPattern, (match, linkText) => {
        const parts = linkText.split('|');
        const fileName = parts[0].trim();
        const displayText = parts[1] || fileName;
        return `<a href="${fileName}" class="internal-link">${displayText}</a>`;
    });

    // Replace Markdown-style links [text](url)
    const markdownLinkPattern = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
    text = text.replace(markdownLinkPattern, (match, linkText, url) => {
        return `<a href="${url}" target="_blank">${linkText}</a>`;
    });

    return text;
}

function hasPriorityChild(task, emojis) {
    if (task === null) {
        return false;
    }
    for (e in emojis) {
        if (task.text && task.text.includes(emojis[e])) {
            return true;
        }
    }
    if (task.subtasks && task.subtasks.length > 0) {
        let result = false;
        for (t in task.subtasks) {
            result = result || hasPriorityChild(task.subtasks[t], emojis);
        }
        return result;
    }
    return false;
}

async function hasPriorityParent(notePath, task, emojis) {
    for (e in emojis) {
        if (task && task.text && task.text.includes(emojis[e])) {
            return true;
        }
    }
    if (task && task.parent >= 0) {
        return await hasPriorityParent(notePath, await getNthLineAsTask(notePath, task.parent), emojis);
    }
    return false;
}

async function getNthLineAsTask(notePath, n) {
    const lines = await getLines(notePath);
    const nthParse = parseTask(lines[n]);

    let rtrn = null;
    const currPage = dv.page(notePath);
    if (currPage) {
        //starting at -1 because 0 index is after 1 lines
        let found = false;
        let parse;
        currPage.file.tasks.forEach(t => {
            parse = parseTask("- [ ] " + t.text);
            if (!found && parse.text === nthParse.text && parse.priority === nthParse.priority && parse.startDate === nthParse.startDate && parse.dueDate === nthParse.dueDate) {
                rtrn = t;
                found = true;
            }
        });
        return rtrn;
    } else {
        pageNotFoundError();
    }
}

function pageNotFoundError(notePath) {
    console.log("ERROR: page " + notePath + " not found!");
}

function parseTask(line) {
    const match = line.match(/^(\t*)-\s\[(\s|x)\]\s(.*)$/);
    if (match) {
        let result = match[3];
        //if (COMPLETE_ENABLED) {
        //	result = match[3].replace(/\s✅\s\d{4}-\d{2}-\d{2}/, '');
        //}
        let startDate = null;
        const startRe = /🛫\s(\d{4}-\d{2}-\d{2})/
        const startMatch = result.match(startRe);
        if (startMatch) {
            startDate = startMatch[1];
            result = result.replace(startRe, '');
        }
        let endDate = null;
        const dueRe = /📅\s(\d{4}-\d{2}-\d{2})/
        const endMatch = result.match(dueRe);
        if (endMatch) {
            endDate = endMatch[1];
            result = result.replace(dueRe, '');
        }
        let priority = null;
        const priorityMatch = result.match(/(🔺\s?|⏫\s?|🔼\s?|🔽\s?|⏬️\s?)/);
        if (priorityMatch) {
            priority = Array.from(priorityMatch[1])[0];
            result = result.replace(priorityMatch[1], '');
        }
        return {indent: match[1].length, checked: match[2] === 'x', text: result.trimEnd(), priority: priority, startDate: startDate, dueDate: endDate};
    }
    return null;
}

function unparseTask(indent, checked, text, priority, startDate, dueDate) {
    return "\t".repeat(indent) + (checked ? "- [x] " : "- [ ] ") + text + (priority ? " " + priority : '') + (startDate ? " 🛫 " + startDate : '') + (dueDate ? " 📅 " + dueDate : '');
}

async function taskEq(currLines, notePath, currParse, targetTask, expectedIndent) {
    let targetParse = parseTask("- [ ] " + targetTask.text);
    if (currParse && currParse.indent === expectedIndent && targetParse.text === currParse.text && targetParse.dueDate === currParse.dueDate && targetParse.startDate === currParse.startDate && targetParse.priority === currParse.priority) {
        if (!targetTask.parent) {
            return true;
        } else {
            if (currLines) {
                for (let i = targetTask.line; i >= 0; i--) {
                    let p = parseTask(currLines[i]);
                    if (p && p.indent === expectedIndent - 1) {
                        return await taskEq(currLines, notePath, p, await getNthLineAsTask(notePath, targetTask.parent), expectedIndent - 1);
                    }
                }
            }
        }
    }
    return false;
}

async function updateTask(notePath, task, updatedText, isChecked, priority, startDate, dueDate) {
    let lines = await getLines(notePath);
    let t;
    try {
        for (let l in lines) {
            t = parseTask(lines[l]);
            if (t && task && await taskEq(lines, notePath, t, task, t.indent)) {
                if (updatedText === null) {
                    updatedText = t.text
                }
                lines[l] = unparseTask(t.indent, isChecked, updatedText, priority, startDate, dueDate);
                if (t.checked && !isChecked) {
                    lines[l] = lines[l].replace(/\s✅\s\d{4}-\d{2}-\d{2}/, '');
                }
                if (!t.checked && isChecked && COMPLETE_ENABLED) {
                    const currentDate = new Date();

                    // Extract the year, month, and day
                    const year = currentDate.getFullYear();
                    const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are zero-based, so add 1
                    const day = String(currentDate.getDate()).padStart(2, '0');
                    lines[l] += " ✅ " + `${year}-${month}-${day}`;
                }
            }
        }
        const updatedContent = lines.join('\n');
        //console.log(updatedContent);
        const file = app.vault.getAbstractFileByPath(notePath);
        await app.vault.modify(file, updatedContent);
    } catch (error) {
        console.error(error);
    }
}

function createInputDialog(notePath, task) {
    // Create dialog container
    const dialog = document.createElement('div');
    dialog.style.position = 'fixed';
    dialog.style.left = '50%';
    dialog.style.top = '50%';
    dialog.style.transform = 'translate(-50%, -50%)';
    dialog.style.width = '420px';
    dialog.style.padding = '20px';
    dialog.style.backgroundColor = '#1e1e1e';
    dialog.style.border = '1px solid #555';
    dialog.style.zIndex = '1000'; // Make sure dialog is on top
    dialog.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
    dialog.style.borderRadius = '8px';

    const heading = document.createElement('div');
    heading.textContent = 'Edit Task';
    heading.style.fontSize = '18px'; // Set font size larger
    heading.style.fontWeight = 'bold'; // Optional: make it bold
    heading.style.marginBottom = '10px'; // Add space below the heading
    heading.style.marginTop = '-4px';
    dialog.appendChild(heading);

    // Create task input
    const textarea = document.createElement('textarea');
    textarea.value = parseTask("- [ ] " + task.text).text;
    textarea.rows = 3; // Number of visible text lines
    textarea.style.width = '100%';
    textarea.style.marginBottom = '8px';
    textarea.style.resize = 'vertical'; // Allow vertical resizing
    dialog.appendChild(textarea);

    setTimeout(() => {
        textarea.focus();
        textarea.select();
    }, 0);

    dialog.style.backgroundColor = '#1e1e1e';
    dialog.style.border = '1px solid #555';
    dialog.style.zIndex = '1000'; // Make sure dialog is on top
    dialog.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
    dialog.style.borderRadius = '8px';

    // Create a container for the priority label and radio buttons
    const priorityContainer = document.createElement('div');
    priorityContainer.style.display = 'flex';
    priorityContainer.style.marginTop = '4px';
    priorityContainer.style.alignItems = 'top'; // Vertically align the label with the grid

    // Create priority label
    const priorityLabel = document.createElement('div');
    priorityLabel.textContent = 'Priority:';
    priorityLabel.style.marginRight = '16px'; // Space between the label and grid
    priorityContainer.appendChild(priorityLabel);

    // Create priority radio buttons in a grid layout
    const priorityGrid = document.createElement('div');
    priorityGrid.style.display = 'grid';
    priorityGrid.style.gridTemplateColumns = '2.5fr 2fr 3fr'; // 3 columns
    priorityGrid.style.gridGap = '6px'; // Gap between grid items

    const priorities = ['⏬️ lowest', '🔽 low', '  none', '🔼 medium', '⏫ high', '🔺 highest'];
    let priorityFound = false;
    const prevPriority = parseTask("- [ ] " + task.text).priority;
    priorities.forEach(priority => {
        const radioContainer = document.createElement('div');

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'priority';
        radio.value = priority;
        if (prevPriority === null & priority === '  none' || prevPriority && prevPriority == Array.from(priority)[0]) {
            radio.checked = true;
            priorityFound = true;
        }
        radioContainer.appendChild(radio);

        const radioLabel = document.createElement('label');
        radioLabel.textContent = priority;
        radioLabel.style.marginLeft = '2px'; // Space between radio and label

        if (priority === '  none') {
            radioLabel.style.paddingLeft = '17px'; // Fine-tune padding to match emoji width
        }

        radioContainer.appendChild(radioLabel);

        priorityGrid.appendChild(radioContainer);
    });

    priorityContainer.appendChild(priorityGrid);
    dialog.appendChild(priorityContainer);

    // Create a container for the start date label and input
    const startDateContainer = document.createElement('div');
    startDateContainer.style.display = 'flex';
    startDateContainer.style.alignItems = 'top';
    startDateContainer.style.marginTop = '16px'; // Add margin for separation

    // Create a label for the start date
    const startDateLabel = document.createElement('div');
    startDateLabel.textContent = '🛫\u00A0Start Date:';
    startDateLabel.style.marginRight = '16px'; // Space between the label and input
    startDateLabel.style.marginTop = '3px';
    startDateContainer.appendChild(startDateLabel);

    // Create date input
    const startDateInput = document.createElement('input');
    startDateInput.type = 'date';
    const prevStartDate = task.text.match(/🛫\s(\d{4}-\d{2}-\d{2})/);
    startDateInput.value = prevStartDate ? prevStartDate[1] : ''; // Set the current due date if it exists
    startDateInput.style.marginBottom = '8px';
    startDateContainer.appendChild(startDateInput);

    dialog.appendChild(startDateContainer);

    // Create a container for the due date label and input
    const dueDateContainer = document.createElement('div');
    dueDateContainer.style.display = 'flex';
    dueDateContainer.style.alignItems = 'top';
    dueDateContainer.style.marginTop = '2px'; // Add margin for separation

    // Create a label for the due date
    const dueDateLabel = document.createElement('div');
    dueDateLabel.textContent = '📅\u00A0\u00A0Due Date:';
    dueDateLabel.style.marginRight = '18px'; // Space between the label and input
    dueDateLabel.style.marginTop = '3px';
    dueDateContainer.appendChild(dueDateLabel);

    // Create date input
    const dueDateInput = document.createElement('input');
    dueDateInput.type = 'date';
    const prevDueDate = task.text.match(/📅\s(\d{4}-\d{2}-\d{2})/);
    dueDateInput.value = prevDueDate ? prevDueDate[1] : ''; // Set the current due date if it exists
    dueDateInput.style.marginBottom = '8px';
    dueDateContainer.appendChild(dueDateInput);

    dialog.appendChild(dueDateContainer);

    // Create button container for Save and Cancel buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'center'; // Center the buttons horizontally
    buttonContainer.style.marginTop = '12px';

    // Create Save button
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Apply';
    saveButton.style.flex = '3';
    saveButton.style.backgroundColor = "#8a5cf4";

    // Change button color on hover
    saveButton.addEventListener('mouseover', () => {
        saveButton.style.backgroundColor = '#a68af9'; // Change color to green on hover
    });

    saveButton.addEventListener('mouseout', () => {
        saveButton.style.backgroundColor = '#8a5cf4'; // Revert to default color
    });

    buttonContainer.appendChild(saveButton);

    // Create Cancel button
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.style.marginLeft = '8px';
    cancelButton.style.flex = '1';
    buttonContainer.appendChild(cancelButton);

    dialog.appendChild(buttonContainer);

    // Append dialog to body
    document.body.appendChild(dialog);

    // Save button event listener
    const saveTask = () => {
        let selectedPriority = null;
        if (dialog.querySelector('input[name="priority"]:checked')) {
            selectedPriority = dialog.querySelector('input[name="priority"]:checked').value;
            selectedPriority = Array.from(selectedPriority)[0];
            if (selectedPriority === " ") {
                selectedPriority = null;
            }
        }

        updateTask(notePath, task, parseTask("- [ ] " + textarea.value).text, task.checked, selectedPriority, startDateInput.value, dueDateInput.value);

        document.body.removeChild(dialog);
    };

    // Cancel button event listener
    const cancelDialog = () => {
        document.body.removeChild(dialog);
    };

    saveButton.addEventListener('click', saveTask);
    cancelButton.addEventListener('click', cancelDialog);

    // Add keydown event listener for keyboard shortcuts
    dialog.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            saveTask();
        } else if (event.key === 'Escape') {
            cancelDialog();
        }
    });
}
