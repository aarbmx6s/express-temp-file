# express-temp-file

Simple file manager for express.

# Install
```js
npm i express-temp-file
```

# Usage

Server:

```js
const express = require('express');
const tempFile = require('express-temp-file');

const fileReturner = fileTemp.returner();
const fileSaver = fileTemp.saver({
    maxSize: '1mb',
    type: ['image/png']
});
const app = express();

app.post('/file', fileSaver);
app.get('/file/:fid', fileReturner);
app.get('/file/test/:fid', async function(req, res) {
    let fileId = req.params.fid;

    // Test if file exists
    if ( fileTemp.exists(fileId) ) {
        console.log(`File "${fileId}" exists.`);
    } else {
        console.log(`File "${fileId}" not exists.`);
        res.status(404);
        res.send();
        return;
    }

    // Retrieve data of file
    let fileData = await fileTemp.file(fileId);

    if ( !fileData ) {
        console.log(`File "${fileId}" not found.`);
        res.status(404);
        res.send();
        return;
    }

    let result = `File extension: ${fileData.ext}.\n`;

    result += `File mime: ${fileData.mime}.\n`;
    result += `File size: ${fileData.size}.`;

    res.send(result);
});
```

For example:
* Your need save some data about your cat with its name, color, age and photo;
* Your form enctype either `application/x-www-form-urlencoded` or `text/plain`;
* Your have file **cat.jpg**;

Just upload your file to the server and get id of this file. Then send this id of file with another fields of your form. On the server side check this file using id, copy to another place or something.

## API

```js
const tempFile = require('express-temp-file');
```

### tempFile.saver(options)
Save file.
Returns [express](https://expressjs.com/en/4x/api.html#router.METHOD) callback.

##### Example

```js
app.post('/file', tempFile.saver({
    maxSize: '1mb',
    type: ['image/png', 'image/png']
}));
```

##### Options

###### `options`

Type: `object`

###### `options.maxSize`

Type: `number` | `string`

Maximum request file size.
See [bytes](https://www.npmjs.com/package/bytes) library.
Default is `'512kb'`.

###### `options.type`

Type: `string[]`

Allowed types of files.
Default is `['application/octet-stream']`

###### `options.folder`

Type: `string`
Folder where files will locate.
Default is system temporary folder.


###### `options.fileName`

Type: `object`
Options for random string generation
* `fileName.type` type of generated file name. 
  Allowed `'hex' | 'numeric' |'distinguishable' | 'alphanumeric'`.
  Default is `alphanumeric`. [More](https://www.npmjs.com/package/crypto-random-string)
* `fileName.length` length of generated file name.
  Default is `64`


### tempFile.returner(options)
Send file.
Returns [express](https://expressjs.com/en/4x/api.html#router.METHOD) callback.
Make a path to files with a path variable (path param) neither **fid** or **id**, or pass the file`s id via query param **fid** or **id**.

##### Example
```js
// https://yoursite.com/file/DMuKL8YtE7
app.get('/file/:fid', tempFile.returner());
app.get('/file/:id', tempFile.returner());

// https://yoursite.com/file?fid=DMuKL8YtE7
// https://yoursite.com/file?id=DMuKL8YtE7
app.get('/file', tempFile.returner());
```

##### Options

###### `options`

Type: `object`

###### `options.folder`

Type: `string`
Folder where files are located.
Default is system temporary folder.


### tempFile.exists(fileName, options)

Test if the file exists.
Returns `boolean`

##### Example

```js
app.get('/file/:fid/exists', function(req, res) {
    if ( fileTemp.exists(req.params.fid) ) {
        res.status(200);
    }
    else {
        res.status(404);
    }

    res.send();
});
```

##### Options

##### `fileName`

Type: `string`
File name

##### `options`

Type: `object`

###### `options.folder`

Type: `string`
Folder where files are located.
Default is system temporary folder.


### fileTemp.file(fileName, options)
Returns `Promise` which resolves data of file.

##### Example
```js
app.get('/file/:fid/mime', function(req, res) {
    Promise.resolve(req.params.fid)
        .then(function(fileName) {
            return fileTemp.file(fileName);
        })
        .then(function(fileData) {
            if ( fileData ) {
                res.send(fileData.mime);
            } else {
                res.status(404);
                res.send();
            }
        })
        .catch(function(error) {
            res.status(500);
            res.send();
        });
});
```

##### Options

##### `fileName`

Type: `string`
File name

##### `options`

Type: `object`

###### `options.folder`

Type: `string`
A folder where located files.
Default is system temporary folder.


### File data

Type: `object`

###### `fileData.ext`

Type: `string`
The extension of the file like **jpg**, **png** or something.

###### `fileData.mime`

Type: `string`
The [MIME](https://en.wikipedia.org/wiki/Media_type) of the file like **image/jpeg**, **image/png** or something.
For detection of the file`s MIME used [file-type](https://www.npmjs.com/package/file-type) package.

###### `fileData.size`

Type: `number`
The size of the file in bytes.

###### `fileData.path`

Type: `string`
The absolute path to the file.

###### `fileData.copyTo(path)`

Type: `function`
The function for coping the file to new location.
* `path` new file location