const dns = require('dns');
const fs = require('fs');
dns.setServers(['8.8.8.8']);

const srvDomain = '_mongodb._tcp.cluster1.0pycd.mongodb.net';

dns.resolveSrv(srvDomain, (err, addresses) => {
    if (err) {
        fs.writeFileSync('resolved.txt', "SRV Error: " + err);
        process.exit(1);
    }

    dns.resolveTxt('cluster1.0pycd.mongodb.net', (errTxt, txtRecords) => {
        let options = 'ssl=true&authSource=admin';
        if (!errTxt && txtRecords && txtRecords.length) {
            options += '&' + txtRecords.map(r => r.join('')).join('&');
        }

        const hosts = addresses.map(a => `${a.name}:${a.port}`).join(',');
        const uri = `mongodb://${hosts}/?${options}`;
        fs.writeFileSync('resolved.txt', uri);
    });
});
