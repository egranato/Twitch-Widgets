const fs = require("fs");
const path = require("path");

const deleteRecursive = (root) => {
  const rootPath = path.resolve(root);
  const existingItems = fs.readdirSync(rootPath);

  existingItems.forEach((item) => {
    const filePath = path.join(rootPath, item);

    if (fs.lstatSync(filePath).isDirectory()) {
      deleteRecursive(filePath);
      fs.rmdirSync(filePath);
    } else {
      fs.unlinkSync(filePath);
    }
  });
};

const copyRecursive = (src, dest) => {
  const sourceDir = path.resolve(src);
  const destinationDir = path.resolve(dest);

  const newItems = fs.readdirSync(sourceDir);
  newItems.forEach((item) => {
    const ogPath = path.join(sourceDir, item);
    const newPath = path.join(destinationDir, item);

    if (fs.lstatSync(ogPath).isDirectory()) {
      fs.mkdirSync(newPath);
      copyRecursive(ogPath, newPath);
    } else {
      fs.copyFileSync(ogPath, newPath);
    }
  });
};

const getLatestVersion = () => {
  deleteRecursive("public");
  copyRecursive("../AlbedoClient/dist/albedo-client", "public");
};

getLatestVersion();
