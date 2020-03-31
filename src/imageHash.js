const fs = require('fs');
const fileType = require('file-type');
const jpeg = require('jpeg-js');
const { PNG } = require('pngjs');
const request = require('request');
const blockhash = require('./block-hash.js');
const { URL } = require('url');

const processPNG = (data, bits, method, cb) => {
  try {
    const png = PNG.sync.read(data);
    const res = blockhash(png, bits, method ? 2 : 1);
    cb(null, res);
  } catch (e) {
    cb(e);
  }
};

const processJPG = (data, bits, method, cb) => {
  try {
    const decoded = jpeg.decode(data);
    const res = blockhash(decoded, bits, method ? 2 : 1);
    cb(null, res);
  } catch (e) {
    cb(e);
  }
};

// eslint-disable-next-line
module.exports = (oldSrc, bits, method, cb) => {
  const src = oldSrc;

  const checkFileType = (name, data) => {
    // what is the image type
    const type = fileType(data);
    if (!type || !type.mime) {
      cb(new Error('Mime type not found'));
      return;
    }
    if (typeof name === 'string' && name.lastIndexOf('.') > 0) {
      const ext = name
        .split('.')
        .pop()
        .toLowerCase();
      if (ext === 'png' && type.mime === 'image/png') {
        processPNG(data, bits, method, cb);
      } else if ((ext === 'jpg' || ext === 'jpeg') && type.mime === 'image/jpeg') {
        processJPG(data, bits, method, cb);
      } else {
        cb(new Error(`Unrecognized file extension, mime type or mismatch, ext: ${ext} / mime: ${type.mime}`));
      }
    } else {
      console.warn('No file extension found, attempting mime typing.');
      if (type.mime === 'image/png') {
        processPNG(data, bits, method, cb);
      } else if (type.mime === 'image/jpeg') {
        processJPG(data, bits, method, cb);
      } else {
        cb(new Error(`Unrecognized mime type: ${type.mime}`));
      }
    }
  };

  const handleRequest = (err, res) => {
    if (err) {
      cb(new Error(err));
    } else {
      const url = new URL(res.request.uri.href);
      const name = url.pathname;
      checkFileType(name, res.body);
    }
  };

  const handleReadFile = (err, res) => {
    if (err) {
      cb(new Error(err));
      return;
    }
    checkFileType(src, res);
  };

  // check source
  // is source assigned
  if (src === undefined) {
    cb(new Error('No image source provided'));
    return;
  }

  // is src url or file
  if (Buffer.isBuffer(src)) {
    // file
    handleReadFile(null, src)
  } else {
    // file
    fs.readFile(src, handleReadFile);
  }
};
