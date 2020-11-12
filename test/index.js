const path = require('path');
const config = require('dotenv').config({ path: path.resolve(__dirname, './.env') });
const debug = require('debug')('test');
const express = require('express');
const fileTemp = require('../');

debug(config);

const app = express();
const fileReturner = fileTemp.returner();
const fileSaver = fileTemp.saver({
    maxSize: '1mb',
    type: ['application/json', 'image/png', 'image/jpeg'],
});

app.get('/file/:fid', fileReturner);
app.post('/file', fileSaver);
app.get('/file/test/:fid', async function(req, res) {
    let fileId = req.params.fid;

    if ( fileTemp.exists(fileId) ) {
        debug(`File "${fileId}" exists.`);
    } else {
        debug(`File "${fileId}" not exists.`);
        res.status(404);
        res.send();
        return;
    }

    let fileData = await fileTemp.file(fileId);

    if ( !fileData ) {
        debug(`File "${fileId}" not found.`);
        res.status(404);
        res.send();
        return;
    }

    res.send(`File extension: ${fileData.ext}. File mime: ${fileData.mime}. File size: ${fileData.size}.`);
});
app.listen(process.env.PORT, process.env.HOST, function() {
    let host = process.env.HOST + ':' + process.env.PORT;

    debug(`App listen to ${host}`);
    debug(`Use GET http://${host}/file/:id for retrieving file.`);
    debug(`Use POST http://${host}/file for uploading file.`);
});
