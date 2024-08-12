/*
 * DON'T EDIT THIS FILE!
 * Edit from the symlink and use ./git-update.sh to push
 * (^ note to self)
 */

const VALID_PRIORITIES = ['🔺', '⏫', '🔼', '🔽', '⏬️', '_'];

// Function to split array into chunks
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

// Initial values
let notePath = "";
let renderIndex = 1;
let renderLen = 2;

async function addDVJSQuery(tp, app) {
    const filePath = tp.file.path(true);
    const file = app.vault.getAbstractFileByPath(filePath);
    
    // Parsing file lines
    if (!file) {
        new Notice("Error referencing current file");
        return '';
    }
    const content = await app.vault.read(file);
    let lines = content.split('\n');
    
    // Get the active editor
    const activeLeaf = app.workspace.activeLeaf;
    if (!activeLeaf) {
        new Notice("Error finding active editor");
        return '';
    }
    const editor = activeLeaf.view.sourceMode.cmEditor;
    
    // Get the cursor position
    const cursor = editor.getCursor('from');
    const cursorLine = cursor.line;
    
    let indent = 0;
    let isTaskMatch = lines[cursorLine] ? lines[cursorLine].match(/^(\t*)-\s\[(\s|x)\]\s*$/) : false;
    if (isTaskMatch) {
        indent = isTaskMatch[1].length;
        new Notice("Indents: "+indent);
    }
    let isReplace = isTaskMatch || /^\s*$/.test(lines[cursorLine]);
    
    // Prompt for inputs
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
    
    dialog.style.backgroundColor = '#1e1e1e';
    dialog.style.border = '1px solid #555';
    dialog.style.zIndex = '1000'; // Make sure dialog is on top
    dialog.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
    dialog.style.borderRadius = '8px';
    
    const heading = document.createElement('div');
    heading.textContent = 'Embed Tasks';
    heading.style.fontSize = '18px'; // Set font size larger
    heading.style.fontWeight = 'bold'; // Optional: make it bold
    heading.style.marginBottom = '10px'; // Add space below the heading
    heading.style.marginTop = '-4px';
    dialog.appendChild(heading);
    
    // filename input
    const textarea = document.createElement('textarea');
    // textarea.value = 'bingathon';
    textarea.rows = 1; // Number of visible text lines
    textarea.style.width = '100%';
    textarea.style.marginBottom = '8px';
    textarea.style.resize = 'vertical'; // Allow vertical resizing
    dialog.appendChild(textarea);
    
    setTimeout(() => {
        textarea.focus();
        textarea.select();
    }, 0);

// Create first dropdown (Embed)
    const embedDropdown = document.createElement('select');
    embedDropdown.style.width = 'auto'; // Automatically adjust width based on content
    embedDropdown.style.minWidth = '45px'; // Set a minimum width

// Create second dropdown (Out of)
    const outOfDropdown = document.createElement('select');
    outOfDropdown.style.width = 'auto'; // Automatically adjust width based on content
    outOfDropdown.style.minWidth = '45px'; // Set a minimum width
    outOfDropdown.style.marginRight = '10px';

// Populate second dropdown
    const maxOptions = [1, 2, 3];
    maxOptions.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        if (option === renderLen) {
            opt.selected = true; // Set the default selected option to 2
        }
        outOfDropdown.appendChild(opt);
    });

// Rendered priorities text
    const prioritiesText = document.createElement('span');
    prioritiesText.style.textAlign = 'center';
    prioritiesText.style.color = '#fff'; // Text color
    prioritiesText.style.marginLeft = '10px'; // Space between dropdowns and text

// Update first dropdown based on second dropdown selection
    const updateEmbedDropdown = () => {
        const maxValue = parseInt(outOfDropdown.value, 10);
        renderLen = maxValue; // Update renderLen with selected value
        embedDropdown.innerHTML = ''; // Clear existing options
        
        for (let i = 1; i <= maxValue; i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = i;
            embedDropdown.appendChild(opt);
        }
        
        // Update priorities text whenever the dropdowns change
        updatePrioritiesText();
    };

// Initialize first dropdown
    updateEmbedDropdown();

// Add event listeners to update dropdown and priorities text
    outOfDropdown.addEventListener('change', updateEmbedDropdown);
    embedDropdown.addEventListener('change', () => {
        renderIndex = parseInt(embedDropdown.value, 10); // Update renderIndex with selected value
        updatePrioritiesText();
    });

// Add label, dropdowns, and priorities text to dialog
    const dropdownContainer = document.createElement('div');
    dropdownContainer.style.display = 'flex';
    dropdownContainer.style.alignItems = 'center'; // Center elements vertically
    dropdownContainer.style.marginBottom = '8px';

// Create label and embed "out of" layout
    const label = document.createElement('span');
    label.textContent = 'Embed #';
    label.style.marginRight = '6px';
    label.style.color = '#fff'; // Text color
    
    const outOfLabel = document.createElement('span');
    outOfLabel.textContent = 'of';
    outOfLabel.style.marginLeft = '8px';
    outOfLabel.style.marginRight = '8px';
    outOfLabel.style.color = '#fff'; // Text color
    
    dropdownContainer.appendChild(label);
    dropdownContainer.appendChild(embedDropdown);
    dropdownContainer.appendChild(outOfLabel);
    dropdownContainer.appendChild(outOfDropdown);
    dropdownContainer.appendChild(prioritiesText);
    
    dialog.appendChild(dropdownContainer);

// Initial render of priorities text
    updatePrioritiesText();

// Function to update priorities text
    function updatePrioritiesText() {
        const prioritiesChunks = splitArray(VALID_PRIORITIES, renderLen);
        const prioritiesShown = prioritiesChunks[renderIndex - 1]?.join(' ') || '';
        prioritiesText.innerHTML = `Rendered priorities<br>${prioritiesShown}`;
    }
    
    // Container for indent dropdown
    const indentContainer = document.createElement('div');
    indentContainer.style.display = 'flex';
    indentContainer.style.alignItems = 'center'; // Center elements vertically
    indentContainer.style.marginBottom = '8px';
    
    // Create label
    const indentLabel = document.createElement('span');
    indentLabel.textContent = 'Indent:';
    indentLabel.style.marginRight = '6px';
    indentLabel.style.color = '#fff'; // Text color
    
    // Create second dropdown (Out of)
    const indentDropdown = document.createElement('select');
    indentDropdown.style.width = 'auto'; // Automatically adjust width based on content
    indentDropdown.style.minWidth = '45px'; // Set a minimum width
    indentDropdown.style.marginRight = '10px';

    // Populate indent dropdown
    const indentOptions = [0, 1, 2, 3, 4, 5, 6];
    indentOptions.forEach(option => {
        const opt = document.createElement('option');
        opt.value = option;
        opt.textContent = option;
        if (option === indent) {
            opt.selected = true;
        }
        indentDropdown.appendChild(opt);
    });
    
    indentContainer.appendChild(indentLabel);
    indentContainer.appendChild(indentDropdown);
    
    indentDropdown.addEventListener('change', () => {
        indent = parseInt(indentDropdown.value, 10); // Update indent with selected value
    });
    
    dialog.appendChild(indentContainer);
    
    // Create button container for Save and Cancel buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'center'; // Center the buttons horizontally
    buttonContainer.style.marginTop = '12px';
    
    // Create Save button
    const saveButton = document.createElement('button');
    saveButton.textContent = 'Save';
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
    
    async function fileExists(noteName) {
        const allFiles = app.vault.getMarkdownFiles(); // Retrieve all markdown files in the vault
        
        // Check if any file has an exact match with the given noteName
        const isFileMatch = allFiles.some(file => {
            return file.basename === noteName.substring(noteName.lastIndexOf('/') + 1);
        });
        
        return isFileMatch;
    }
    
    // Save button event listener
    const saveListener = async () => {
        notePath = textarea.value;
        
        if (await fileExists(notePath)) {
            const DVJSPath = 'System\ Scripts/render-tasks/tasks.js';
            const tasksFile = app.vault.getAbstractFileByPath(DVJSPath);
            let tasksCode = '';
    
            if (tasksFile) {
                tasksCode = await app.vault.read(tasksFile);
            } else {
                new Notice(`${DVJSPath} file not found!`);
                return;
            }
            
            let query = `\`\`\`dataviewjs
let NOTE_PATH = "${notePath}";
let RENDER_LEN = ${renderLen};
let RENDER_INDEX = ${renderIndex};
let INDENT = ${indent};
${tasksCode}
\`\`\``;
            
            let queryLines = query.split('\n');
    
            if (isReplace) {
                lines.splice(cursorLine, 1, ...queryLines);
            } else {
                lines.splice(cursorLine + 1, 0, ...queryLines);
            }
    
            const updatedContent = lines.join('\n');
            // console.log(updatedContent);
            await app.vault.modify(file, updatedContent);
        } else {
            new Notice('File not found!');
        }
        
        document.body.removeChild(dialog);
    };
    
    // Cancel button event listener
    const cancelDialog = () => {
        document.body.removeChild(dialog);
    };
    
    saveButton.addEventListener('click', saveListener);
    cancelButton.addEventListener('click', cancelDialog);
    
    // Add keydown event listener for keyboard shortcuts
    dialog.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            saveListener();
        } else if (event.key === 'Escape') {
            cancelDialog();
        }
    });
    return ''
}

module.exports = addDVJSQuery;