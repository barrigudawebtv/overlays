const CONFIG = {
    API_URL: '/api/programas',
    PDF_LOGO_ID: 'logo-sistema',
    PDF_NOME_ARQUIVO: 'grade_programacao.pdf'
};

const CORES = {
    linhaImpar: [240, 248, 255],
    alertaFundo: [255, 235, 235],
    alertaTexto: [211, 47, 47]
};

class ProgramaTV {
    constructor(horario, nomeArtistico, nomePrograma, categorias, frequencia, dias = [], alerta = false, id = null) {
        this.id = id;
        this.horario = horario;
        this.nomeArtistico = nomeArtistico;
        this.nomePrograma = nomePrograma;
        this.categorias = Array.isArray(categorias) ? categorias : (categorias ? [categorias] : []);
        this.frequencia = frequencia;
        this.dias = dias || [];
        this.alerta = !!alerta;
        this.disponibilidadeFormatada = this.formatarDisponibilidade();
    }

    formatarDisponibilidade() {
        let cssClass = 'freq-padrao';
        const freqUpper = (this.frequencia || '').toUpperCase();

        if (freqUpper.includes('SEMANAL')) cssClass = 'freq-semanal';
        else if (freqUpper.includes('DIÁRIO') || freqUpper.includes('DIARIO')) cssClass = 'freq-diario';
        else if (freqUpper.includes('MENSAL')) cssClass = 'freq-mensal';
        else if (freqUpper.includes('QUINZENAL')) cssClass = 'freq-quinzenal';

        const diasStr = this.dias.length > 0 ? ` <small>(${this.dias.join(', ')})</small>` : '';
        return `<span class="badge ${cssClass}">${this.frequencia}</span>${diasStr}`;
    }
}

class ProgramaRepository {
    async obterTodos() {
        try {
            const response = await fetch(CONFIG.API_URL);
            const data = await response.json();
            return data.map(p => new ProgramaTV(
                p.horario, p.nomeArtistico, p.nomePrograma, p.categorias, 
                p.frequencia, p.dias, p.alerta, p.id
            ));
        } catch (error) {
            console.error('Erro ao buscar programas:', error);
            return [];
        }
    }

    async salvar(programa) {
        const metodo = programa.id ? 'PUT' : 'POST';
        const url = programa.id ? `${CONFIG.API_URL}/${programa.id}` : CONFIG.API_URL;
        
        try {
            const response = await fetch(url, {
                method: metodo,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(programa)
            });
            return await response.json();
        } catch (error) {
            console.error('Erro ao salvar programa:', error);
        }
    }

    async excluir(id) {
        try {
            await fetch(`${CONFIG.API_URL}/${id}`, { method: 'DELETE' });
        } catch (error) {
            console.error('Erro ao excluir programa:', error);
        }
    }
}

class App {
    constructor() {
        this.repository = new ProgramaRepository();
        this.programaEmEdicao = null;
        this.init();
    }

    async init() {
        this.configurarEventos();
        await this.atualizarTabela();
        this.navegar('dashboard');
    }

    configurarEventos() {
        document.getElementById('formPrograma').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.salvarPrograma();
        });
    }

    navegar(tela) {
        document.getElementById('tela-dashboard').style.display = tela === 'dashboard' ? 'block' : 'none';
        document.getElementById('tela-cadastro').style.display = tela === 'cadastro' ? 'block' : 'none';
        
        document.getElementById('nav-dash').classList.toggle('active', tela === 'dashboard');
        document.getElementById('nav-cad').classList.toggle('active', tela === 'cadastro');

        if (tela === 'cadastro' && !this.programaEmEdicao) {
            document.getElementById('formPrograma').reset();
            document.getElementById('idPrograma').value = '';
        }
    }

    async atualizarTabela() {
        const tbody = document.querySelector('#tabelaProgramas tbody');
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Carregando dados...</td></tr>';
        
        const programas = await this.repository.obterTodos();
        tbody.innerHTML = '';

        if (programas.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhum programa cadastrado.</td></tr>';
            return;
        }

        programas.forEach(p => {
            const tr = document.createElement('tr');
            if (p.alerta) tr.style.backgroundColor = 'var(--alertaFundo, #ffebeb)';
            
            const trAlerta = p.alerta ? `<i class="fas fa-exclamation-triangle" style="color:#d35400;" title="Atenção"></i>` : '';
            
            tr.innerHTML = `
                <td><b>${p.horario}</b> ${trAlerta}</td>
                <td>${p.nomeArtistico}</td>
                <td>${p.nomePrograma}</td>
                <td>${p.categorias.join(', ')}</td>
                <td>${p.disponibilidadeFormatada}</td>
                <td>
                    <button class="btn-action btn-edit" onclick="app.editarPrograma(${p.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn-action btn-delete" onclick="app.excluirPrograma(${p.id})"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    async verificarConflito(horario, dias, idEditado) {
        const programas = await this.repository.obterTodos();
        
        for (const p of programas) {
            if (idEditado && p.id === parseInt(idEditado)) continue;

            if (p.horario === horario) {
                // Filtra ignorando o "Exc"
                const diasEmComum = p.dias.filter(dia => dias.includes(dia) && dia !== 'Exc');
                
                if (diasEmComum.length > 0) {
                    return {
                        conflito: true,
                        nomePrograma: p.nomePrograma,
                        diasConflito: diasEmComum
                    };
                }
            }
        }
        
        return { conflito: false };
    }

    async salvarPrograma() {
        const id = document.getElementById('idPrograma').value;
        const horario = document.getElementById('horario').value;
        const nomeArtistico = document.getElementById('nomeArtistico').value;
        const nomePrograma = document.getElementById('nomePrograma').value;
        const frequencia = document.getElementById('frequencia').value;
        const alerta = document.getElementById('alerta').checked;

        const categorias = Array.from(document.querySelectorAll('.categorias-grid input:checked')).map(cb => cb.value);
        const dias = Array.from(document.querySelectorAll('.dias-grid input:checked')).map(cb => cb.value);

        const checagem = await this.verificarConflito(horario, dias, id);
        
        if (checagem.conflito) {
            alert(`⚠️ CONFLITO DE HORÁRIO!\n\nO programa "${checagem.nomePrograma}" já está ocupando este horário no(s) dia(s): ${checagem.diasConflito.join(', ')}.\n\nPor favor, escolha outro horário ou dia.`);
            return; 
        }

        const programa = new ProgramaTV(horario, nomeArtistico, nomePrograma, categorias, frequencia, dias, alerta, id ? parseInt(id) : null);

        await this.repository.salvar(programa);
        
        this.programaEmEdicao = null;
        document.getElementById('formPrograma').reset();
        await this.atualizarTabela();
        this.navegar('dashboard');
    }

    async editarPrograma(id) {
        const programas = await this.repository.obterTodos();
        const programa = programas.find(p => p.id === id);
        if (!programa) return;

        this.programaEmEdicao = programa;
        
        document.getElementById('idPrograma').value = programa.id;
        document.getElementById('horario').value = programa.horario;
        document.getElementById('nomeArtistico').value = programa.nomeArtistico;
        document.getElementById('nomePrograma').value = programa.nomePrograma;
        document.getElementById('frequencia').value = programa.frequencia;
        document.getElementById('alerta').checked = programa.alerta;

        document.querySelectorAll('.categorias-grid input').forEach(cb => {
            cb.checked = programa.categorias.includes(cb.value);
        });

        document.querySelectorAll('.dias-grid input').forEach(cb => {
            cb.checked = programa.dias.includes(cb.value);
        });

        this.navegar('cadastro');
    }

    async excluirPrograma(id) {
        if (confirm('Tem certeza que deseja excluir este programa?')) {
            await this.repository.excluir(id);
            await this.atualizarTabela();
        }
    }

    async gerarRelatorio() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [297, 167.06]
        });
        
        const logoImg = document.getElementById(CONFIG.PDF_LOGO_ID);
        if (logoImg) {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = logoImg.width;
                canvas.height = logoImg.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(logoImg, 0, 0);
                const dataURL = canvas.toDataURL('image/png');
                doc.addImage(dataURL, 'PNG', 15, 10, 20, 20);
            } catch (e) {
                console.warn("Não foi possível carregar a logo no PDF.");
            }
        }

        doc.setFontSize(16);
        doc.text('Lista de Programas da Barriguda Web TV', 40, 20);
        doc.setFontSize(10);
        
        doc.text('Responsável: Professora Jefferson Maciel', 40, 28);
        
        const dataHoje = new Date().toLocaleString('pt-BR');
        const pageWidth = doc.internal.pageSize.getWidth();
        doc.text(`Gerado em: ${dataHoje}`, pageWidth - 15, 28, { align: 'right' });

        const programas = await this.repository.obterTodos();
        
        const dadosTabela = programas.map(p => [
            p.alerta ? `${p.horario} (!)` : p.horario,
            p.nomeArtistico,
            p.nomePrograma,
            p.categorias.join(', '),
            p.frequencia + (p.dias.length ? `\n(${p.dias.join(', ')})` : '')
        ]);

        doc.autoTable({
            startY: 35,
            head: [['Horário', 'Artista', 'Programa', 'Categorias', 'Frequência']],
            body: dadosTabela,
            theme: 'grid',
            headStyles: { fillColor: [0, 145, 212] },
            alternateRowStyles: { fillColor: CORES.linhaImpar },
            columnStyles: { 
                0: { fontStyle: 'bold', cellWidth: 25, halign: 'center' }, 
                4: { cellWidth: 40 }
            },
            margin: { left: 15, right: 15 },
            didParseCell: function(data) {
                if (data.section === 'body' && data.row.raw[0].includes('(!)')) {
                    data.cell.styles.fillColor = CORES.alertaFundo;
                    data.cell.styles.textColor = CORES.alertaTexto;
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        });

        doc.save(CONFIG.PDF_NOME_ARQUIVO);
    }
}

const app = new App();