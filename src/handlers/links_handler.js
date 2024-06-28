const config = require("../../config.json");
let maxVideoSize;

if (!config.general.localServer) {
    // If localServer is empty, set maxVideoSize to 50MB
    maxVideoSize = 50 * 1024 * 1024;
} else {
    // If localServer is not empty, set maxVideoSize to 2GB
    maxVideoSize = 2 * 1024 * 1024 * 1024;
}

// If fileSize is defined and smaller than maxVideoSize, override maxVideoSize
if (config.general.fileSize && config.general.fileSize < maxVideoSize) {
    maxVideoSize = config.general.fileSize;
}

module.exports = {
    maxVideoSize,
};


