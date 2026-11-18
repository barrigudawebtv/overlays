const API = {
    async get() { return (await fetch('/api/match')).json(); },
    async update(data) {
        await fetch('/api/update', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(data)
        });
    },
    async timer(action) { await fetch(`/api/timer/${action}`, { method: 'POST' }); }
};

// Lógica do Placar (View)
if (document.getElementById('scoreboard-view')) {
    setInterval(async () => {
        const data = await API.get();
        document.getElementById('teamA').innerText = data.team_a_name;
        document.getElementById('teamB').innerText = data.team_b_name;
        document.getElementById('score').innerText = `${data.score_a} X ${data.score_b}`;
        document.getElementById('status').innerText = data.status;
        
        const mins = Math.floor(data.current_seconds / 60).toString().padStart(2, '0');
        const secs = Math.floor(data.current_seconds % 60).toString().padStart(2, '0');
        document.getElementById('timer').innerText = `${mins}:${secs}`;
    }, 1000);
}

// Lógica do Admin
if (document.getElementById('admin-view')) {
    document.getElementById('btnStart').onclick = () => API.timer('start');
    document.getElementById('btnPause').onclick = () => API.timer('pause');
    document.getElementById('btnResetTime').onclick = () => API.timer('reset');
    
    document.getElementById('btnUpdateScore').onclick = () => {
        API.update({
            score_a: document.getElementById('inputScoreA').value,
            score_b: document.getElementById('inputScoreB').value,
            team_a_name: document.getElementById('inputNameA').value,
            team_b_name: document.getElementById('inputNameB').value,
            status: document.getElementById('inputStatus').value
        });
    };
}