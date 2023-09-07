import http from 'k6/http';
import { sleep } from 'k6';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";

export const options = {
    vus: 1000,
    iterarions: 200,
    duration: '60s',
};

export default function () {
    http.get('http://localhost:3000');
    sleep(1);
}

// export function handleSummary(data) {
//     return {
//       "summary.html": htmlReport(data),
//     };
// }