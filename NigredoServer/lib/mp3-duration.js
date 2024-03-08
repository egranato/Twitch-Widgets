var mp3Duration = require('mp3-duration');

const getDurationInMiliseconds = (file) => {
    return new Promise((res, rej) => {
        mp3Duration(file,  (err, duration) => {
          if (err) return rej(err);
          return res(duration * 1000);
        });
    });
};

module.exports = { getDurationInMiliseconds };