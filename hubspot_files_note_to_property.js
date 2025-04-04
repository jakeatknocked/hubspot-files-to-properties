const hubspot = require('@hubspot/api-client');

// Helper: Convert a stream to a string
const streamToString = async (stream) => {
  return new Promise((resolve, reject) => {
    let chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    stream.on('error', (err) => reject(err));
  });
};

// Log function with categories
const logThis = (message, category = 'DEBUG') => {
  const loggingConfig = {
    DEBUG: true,
    RESPONSE: true,
    PROCESS: true
  };

  if (loggingConfig[category]) console.log(`[${category}] ${message}`);
};

exports.main = async (event, callback) => {
  logThis("🚀 Starting the function...", 'PROCESS');

  // CONFIGURATION: Set default values here for reusability.
  const CONFIG = {
    sourceObjectType: 'deal',  // Change to 'contact' for contact workflows.
    keyword: 'test to search in file name',  // Use lowercase; this is what you'll search for in bodyPreview / File Name.
    targetProperty: 'property_id_to_update'  // The internal property to update.
  };

  const config = {
    sourceObjectType: event.inputFields['sourceObjectType'] || CONFIG.sourceObjectType,
    keyword: event.inputFields['keyword'] ? event.inputFields['keyword'].toLowerCase() : CONFIG.keyword,
    targetProperty: event.inputFields['targetProperty'] || CONFIG.targetProperty
  };

  logThis(`🔧 Config: ${JSON.stringify(config, null, 2)}`, 'DEBUG');

  const objectId = event.inputFields['objectId'] || event.inputFields['contactId'] || event.inputFields['dealId'];
  logThis(`✅ Received Object ID: ${objectId}`, 'PROCESS');
  
  if (!objectId) {
    callback({ outputFields: { message: 'No object ID provided.' } });
    return;
  }

  const hubspotClient = new hubspot.Client({ accessToken: process.env.HUBSPOT_API_KEY });

  try {
    logThis(`📥 Fetching note associations for ${config.sourceObjectType} ID: ${objectId}`, 'PROCESS');
    
    const assocResponse = await hubspotClient.apiRequest({
      method: 'GET',
      path: `/crm/v4/objects/${config.sourceObjectType}s/${objectId}/associations/notes`
    });

    let assocBody = assocResponse.body && typeof assocResponse.body.pipe === 'function'
      ? await streamToString(assocResponse.body)
      : assocResponse.body;

    const assocData = typeof assocBody === 'string' ? JSON.parse(assocBody) : assocBody;
    
    if (!assocData || !assocData.results || assocData.results.length === 0) {
      logThis("❌ No note engagements found.", 'RESPONSE');
      callback({ outputFields: { message: 'No note engagements found.' } });
      return;
    }
    
    const noteIds = assocData.results.map((assoc) => assoc.toObjectId);
    logThis(`📄 Note Engagement IDs: ${JSON.stringify(noteIds)}`, 'DEBUG');

    let attachmentId = null;

    for (const noteId of noteIds) {
      logThis(`🔍 Processing note engagement ID: ${noteId}`, 'PROCESS');
      try {
        const legacyResponse = await hubspotClient.apiRequest({
          method: 'GET',
          path: `/engagements/v1/engagements/${noteId}`
        });

        let legacyBody = legacyResponse.body && typeof legacyResponse.body.pipe === 'function'
          ? await streamToString(legacyResponse.body)
          : legacyResponse.body;

        const legacyData = typeof legacyBody === 'string' ? JSON.parse(legacyBody) : legacyBody;
        
        if (legacyData && legacyData.attachments && legacyData.attachments.length > 0) {
          const attachmentIds = legacyData.attachments.map((att) => att.id);
          logThis(`   Attachments for note ${noteId}: ${JSON.stringify(attachmentIds)}`, 'DEBUG');

          for (const att of legacyData.attachments) {
            const attId = att.id;
            logThis(`   Checking attachment ID: ${attId}`, 'PROCESS');

            const fileResponse = await hubspotClient.apiRequest({
              method: 'GET',
              path: `/files/v3/files/${attId}`
            });

            let fileBody = fileResponse.body && typeof fileResponse.body.pipe === 'function'
              ? await streamToString(fileResponse.body)
              : fileResponse.body;

            const fileData = typeof fileBody === 'string' ? JSON.parse(fileBody) : fileBody;
            logThis(`File Data: ${JSON.stringify(fileData, null, 2)}`, 'DEBUG');

            if (fileData && fileData.name && fileData.name.toLowerCase().includes(config.keyword)) {
              attachmentId = fileData.id;
              logThis(`✅ Found matching file with ID: ${attachmentId}`, 'RESPONSE');
              break;
            }
          }
          if (attachmentId) break;
        } else {
          logThis(`   No attachments found for note ${noteId}.`, 'RESPONSE');
        }
      } catch (err) {
        logThis(`❌ Error processing note engagement ID ${noteId}: ${err.message}`, 'RESPONSE');
      }
      if (attachmentId) break;
    }

    if (attachmentId) {
      logThis(`✅ Successfully found the attachment ID. Updating target property: ${config.targetProperty}`, 'PROCESS');
      if (config.sourceObjectType === 'deal') {
        await hubspotClient.crm.deals.basicApi.update(objectId, {
          properties: { [config.targetProperty]: attachmentId }
        });
      } else if (config.sourceObjectType === 'contact') {
        await hubspotClient.crm.contacts.basicApi.update(objectId, {
          properties: { [config.targetProperty]: attachmentId }
        });
      }
      callback({
        outputFields: { 
          [config.targetProperty]: attachmentId,
          message: 'Attachment ID found and property updated.' 
        }
      });
    } else {
      logThis("❌ No matching attachment found in note engagements.", 'RESPONSE');
      callback({ outputFields: { message: 'No matching attachment found in note engagements.' } });
    }
  } catch (error) {
    logThis(`❌ Error in processing: ${error.message}`, 'RESPONSE');
    callback({ outputFields: { message: `An error occurred: ${error.message}` } });
  }
};