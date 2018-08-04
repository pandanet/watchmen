if (process.env.MODE==='monitor') {
    require('./run-monitor-server');
} else {
    require('./run-web-server');
}