const fetch = require('node-fetch');

(async () => {
  try {
    const res = await fetch('https://intelx-148e.onrender.com/execute/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId: 'e98b584d-2a1c-4b6d-a7f4-3d9a1c6e8f42',
        language: 'python',
        version: '3.10.0',
        code: 'def solution(nums, target):\n    print(1)\n',
        isRun: true
      })
    });
    console.log(res.status);
    console.log(await res.text());
  } catch (e) { console.error(e); }
})();
