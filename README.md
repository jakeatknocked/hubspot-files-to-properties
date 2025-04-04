# HubSpot Custom Code Workflow - Attachment From Notes to Record Property by Name

This repository provides a **Node.js-based script** designed to be used in a **HubSpot Custom Code block**. It retrieves file attachments from notes associated with HubSpot records (Deals or Contacts) and updates a specified property with the matching file's ID.

## 🔥 Features
- Searches for attachments within Notes associated with Deals or Contacts.
- Matches file names based on a specified keyword.
- Updates a given property with the matching file's ID.
- **Configurable Logging**: Enable or disable different log types (`DEBUG`, `RESPONSE`, `PROCESS`) via a configuration object.

## 📂 Configuration
This code block can be run directly within a **HubSpot Custom Code workflow**.

### Config Object
```javascript
const CONFIG = {
    sourceObjectType: 'deal',  // Can be 'deal' or 'contact'.
    keyword: 'test to search in file name',  // The keyword to search for in attachment names.
    targetProperty: 'property_id_to_update'  // The property to update with the matching file ID.
};
```

### Logging Configuration
Logging is handled by the `logThis` function. You can enable or disable logs by modifying the `loggingConfig` object:
```javascript
const loggingConfig = {
    DEBUG: true,
    RESPONSE: true,
    PROCESS: true
};
```

Set any of these values to `false` to suppress logs of that category.

## 📌 Installation & Setup
1. Go to **HubSpot > Automation > Workflows**.
2. Create or edit an existing workflow.
3. Add a **Custom Code Action** block.
4. Paste the provided code into the code block.
5. Define the input properties in your workflow to match the `CONFIG` settings.

### Input Properties Required
- `objectId`: The ID of the deal or contact being processed.
- `keyword`: The keyword to search for within attachment names.
- `targetProperty`: The property to update with the attachment ID.

## 📤 Output Properties
The code will return:
- `message`: A success or error message.
- `property_id_to_update`: The file ID if found and successfully saved to the target property.

## 📄 Example Usage
```javascript
const CONFIG = {
    sourceObjectType: 'deal',
    keyword: 'r2 - prq contract',
    targetProperty: 'contingency_agreement'
};
```
This configuration will:
- Search for files associated with a Deal that contain `r2 - prq contract` in the file name.
- Save the attachment ID to the property `contingency_agreement`.

## 📝 Notes
- Make sure your **HubSpot Private App API Key** is properly configured via `process.env.HUBSPOT_API_KEY`.
- This code should be pasted **directly into a HubSpot Custom Code block**.

## 📜 License
MIT

---

Happy coding! 🚀

