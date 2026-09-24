function cleanServer(v){v=String(v||"").trim();v=v.replace(/^https:\/(?!\/)/i,"https://").replace(/^http:\/(?!\/)/i,"http://");if(/^https:[^/]/i.test(v))v=v.replace(/^https:/i,"https://");if(/^http:[^/]/i.test(v))v=v.replace(/^http:/i,"http://");v=v.replace(/\/+$/,"");if(v&&!/^https?:\/\//i.test(v))v="http://"+v;return v}
const cases={
"https:/npmulti.lat":"https://npmulti.lat",
"https://npmulti.lat":"https://npmulti.lat",
"http:/example.com":"http://example.com",
"example.com":"http://example.com"
};
let bad=0;for(const [input,expected] of Object.entries(cases)){const got=cleanServer(input);console.log(input,"=>",got);if(got!==expected)bad++}process.exit(bad?1:0);
