const path = require('path');
const fs = require('fs');
const request = require('supertest');
const express = require('express');
const temp = require('../index.js');

const app = express();

app.get('/file/:id', temp.returner());
app.post('/file', temp.saver({
    type: ['image/png'],
    maxSize: '100kb',
}));

describe('Temp file test', () => {
    let file;
    let uploadId;

    beforeAll(() => {
        file = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAyAAAAJYCAYAAACadoJwAAN6QklEQVR4', 'base64');
    });

    test('Upload file', (done) => {
        request(app)
            .post('/file')
            .set('Content-Type', 'image/png')
            .send(file)
            .expect(200)
            .expect((res) => {
                uploadId = res.text;
                expect(uploadId).toEqual(expect.any(String));
            })
            .end(done);
    });

    test('Download file', (done) => {
        request(app)
            .get(`/file/${uploadId}`)
            .expect(200)
            .expect('Content-Type', 'image/png')
            .expect((res) => {
                expect(res.body).toEqual(file);
            })
            .end(done);
    });

    test('Checking file', () => {
        expect(temp.exists(uploadId)).toBe(true);
    });

    test('Get file data', async () => {
        const data = await temp.file(uploadId);

        expect(data.ext).toBe('png');
    });

    test('Copying file', async () => {
        const data = await temp.file(uploadId);
        const fp = path.resolve(__dirname, '1.png');

        data.copyTo(fp);
        expect(fs.existsSync(fp)).toBe(true);
        fs.unlinkSync(fp);
    });

    test('Upload wrong file type', (done) => {
        request(app)
            .post('/file')
            .set('Content-Type', 'image/jpeg')
            .send(file)
            .expect(415)
            .end(done);
    });

    test('Upload big file', (done) => {
        request(app)
            .post('/file')
            .set('Content-Type', 'image/png')
            .send(Buffer.concat([file, Buffer.alloc(300 * 1024)]))
            .expect(413)
            .end(done);
    });

    test('Wrong id', (done) => {
        request(app)
            .get(`/file/${Date.now()}`)
            .expect(404)
            .end(done);
    });
});
