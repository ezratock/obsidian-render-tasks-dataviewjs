/*
 * Note to self:
 * DON'T EDIT THIS FILE!
 * Edit the symlink and use ./git-update.sh to push
 */

module.exports = async (tp) => {
    // Prompt for inputs
    console.log("ok but it wokred tho");
    const notePath = await tp.system.prompt("Enter the note path:", tp.file.path(true));
    const renderLen = await tp.system.prompt("Enter the render length:", "1");
    const renderIndex = await tp.system.prompt("Enter the render index:", "1");
    const indent = await tp.system.prompt("Enter the indent level:", "0");

    // Define the DataviewJS query template
    const query = `
\`\`\`dataviewjs
let NOTE_PATH = "${notePath}";
let RENDER_LEN = ${renderLen};
let RENDER_INDEX = ${renderIndex};
let INDENT = ${indent};

console.log("success! " + notePath + renderLen + renderIndex + indent);
\`\`\`
`;

    // Insert the query into the current note
    const currentContent = await tp.file.content;
    const updatedContent = currentContent + '\n' + query;
    await tp.file.write(updatedContent);
};
