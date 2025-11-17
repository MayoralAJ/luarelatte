// URLs das planilhas
const PLANILHA_ESTABELECIMENTO = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQWk9tQhVjxQMxoXyVlQ9tUde2NO8QUmsNXwQcrvr5o03qClTXy4_WKAdRlWRxkBx7s8JjPPdD9rZra/pub?gid=0&single=true&output=csv';
const PLANILHA_CATEGORIAS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQWk9tQhVjxQMxoXyVlQ9tUde2NO8QUmsNXwQcrvr5o03qClTXy4_WKAdRlWRxkBx7s8JjPPdD9rZra/pub?gid=43225096&single=true&output=csv';
const PLANILHA_ITENS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQWk9tQhVjxQMxoXyVlQ9tUde2NO8QUmsNXwQcrvr5o03qClTXy4_WKAdRlWRxkBx7s8JjPPdD9rZra/pub?gid=772957176&single=true&output=csv';

// Estados dos dados
let estabelecimento = {
    nome: "Carregando...",
    descricao: "",
    telefone: "",
    endereco: "",
    horario: "",
    horario_abertura: "",
    horario_fechamento: "",
    dias_funcionamento: "",
    logo_url: ""
};
let categorias = [];
let itens = [];
let categoriasComItens = [];
let categoriaAtiva = 1;
let carregando = true;
let carrinho = [];
let numeroMesa = null;
let tipoPedidoAtual = 'entrega';
let formaPagamentoAtual = null;

// 🚨 AVISO: Códigos de imagem não funcionam em hospedagem externa
// Para usar imagens, você deve:
// 1. Fazer upload das imagens para Google Drive, Dropbox ou outro serviço
// 2. Colocar as URLs públicas na planilha
// 3. Deixar este objeto vazio para hospedagem externa
const imagensProjeto = {
    // Removido para compatibilidade com hospedagem externa
    // Use URLs do Google Drive ou outros serviços na planilha
};

// ✨ FUNÇÃO: Converter URLs do Google Drive
function converterUrlParaImagemDireta(url) {
    if (!url || url.trim() === '') return null;

    // GOOGLE DRIVE - Múltiplos formatos para tentativa automática
    if (url.includes('drive.google.com')) {
        let fileId = null;

        // Formato 1: /file/d/ID/view
        let match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)\//);
        if (match) {
            fileId = match[1];
        }

        // Formato 2: id=ID (parâmetros)
        if (!fileId) {
            match = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
            if (match) {
                fileId = match[1];
            }
        }

        if (fileId) {
            return {
                tipo: 'google-drive',
                formatos: [
                    `https://lh3.googleusercontent.com/d/${fileId}=w600-h400-k-rw`,
                    `https://drive.google.com/thumbnail?id=${fileId}&sz=w600`,
                    `https://drive.google.com/uc?export=view&id=${fileId}`,
                    `https://docs.google.com/uc?export=view&id=${fileId}`,
                    `https://lh3.googleusercontent.com/d/${fileId}=w400`
                ]
            };
        }
    }

    // URL EXTERNA NORMAL
    else if (url.startsWith('http')) {
        return { tipo: 'url-simples', url: url };
    }

    return null;
}



// Função para converter CSV em array de objetos (melhorada)
function csvParaObjetos(csvText) {
    console.log('CSV recebido:', csvText);

    if (!csvText || csvText.trim() === '') {
        console.error('CSV vazio');
        return [];
    }

    const linhas = csvText.trim().split('\n');

    if (linhas.length < 2) {
        console.error('CSV deve ter pelo menos cabeçalho e uma linha de dados');
        return [];
    }

    // Processar cabeçalho
    const cabecalho = linhas[0].split(',').map(col => col.trim().replace(/"/g, ''));
    console.log('Cabeçalho:', cabecalho);

    // Processar linhas de dados
    const dados = [];
    for (let i = 1; i < linhas.length; i++) {
        const linha = linhas[i].trim();
        if (!linha) continue;

        // Melhor parsing de CSV considerando vírgulas dentro de aspas
        const valores = parseCSVLine(linha);
        const objeto = {};

        cabecalho.forEach((col, index) => {
            let valor = valores[index] || '';

            // Converter valores numéricos
            if (col === 'preco' && valor) {
                valor = parseFloat(valor.replace(',', '.')) || 0;
            }

            // Limpar aspas
            if (typeof valor === 'string') {
                valor = valor.replace(/^"|"$/g, '');
            }

            objeto[col] = valor;
        });

        dados.push(objeto);
    }

    console.log('Dados processados:', dados);
    return dados;
}

// Função para fazer parsing correto de linha CSV
function parseCSVLine(linha) {
    const resultado = [];
    let valorAtual = '';
    let dentroDeAspas = false;

    for (let i = 0; i < linha.length; i++) {
        const char = linha[i];

        if (char === '"') {
            dentroDeAspas = !dentroDeAspas;
        } else if (char === ',' && !dentroDeAspas) {
            resultado.push(valorAtual.trim());
            valorAtual = '';
        } else {
            valorAtual += char;
        }
    }

    resultado.push(valorAtual.trim());
    return resultado;
}

// Função para carregar dados das planilhas
async function carregarDados() {
    try {
        // Mostrar loading
        mostrarLoading();

        console.log('Iniciando carregamento das planilhas...');

        // Carregar estabelecimento
        console.log('Carregando estabelecimento...');
        const respEstabelecimento = await fetch(PLANILHA_ESTABELECIMENTO);
        if (!respEstabelecimento.ok) throw new Error('Erro ao carregar planilha Estabelecimento');

        const csvEstabelecimento = await respEstabelecimento.text();
        const dadosEstabelecimento = csvParaObjetos(csvEstabelecimento);

        if (dadosEstabelecimento.length > 0) {
            estabelecimento = dadosEstabelecimento[0];
            console.log('Estabelecimento carregado:', estabelecimento);
        } else {
            console.warn('Nenhum dado de estabelecimento encontrado');
        }

        // Carregar categorias
        console.log('Carregando categorias...');
        const respCategorias = await fetch(PLANILHA_CATEGORIAS);
        if (!respCategorias.ok) throw new Error('Erro ao carregar planilha Categorias');

        const csvCategorias = await respCategorias.text();
        categorias = csvParaObjetos(csvCategorias);
        console.log('Categorias carregadas:', categorias);

        // Carregar itens
        console.log('Carregando itens...');
        const respItens = await fetch(PLANILHA_ITENS);
        if (!respItens.ok) throw new Error('Erro ao carregar planilha Itens');

        const csvItens = await respItens.text();
        itens = csvParaObjetos(csvItens);
        console.log('Itens carregados:', itens);

        // Combinar categorias com itens
        categoriasComItens = categorias.map(categoria => ({
            ...categoria,
            itens: itens.filter(item => item.categoria_id == categoria.id)
        }));

        console.log('Categorias com itens:', categoriasComItens);

        // Se houver categorias, definir a primeira como ativa
        if (categorias.length > 0) {
            categoriaAtiva = parseInt(categorias[0].id);
        }

        carregando = false;
        ocultarLoading();
        carregarEstabelecimento();
        renderizarCategorias();
        renderizarItens();

        console.log('Carregamento concluído com sucesso!');

    } catch (error) {
        console.error('Erro detalhado ao carregar dados:', error);
        carregando = false;
        ocultarLoading();
        mostrarErroDetalhado(error.message);
    }
}

// Função para mostrar loading
function mostrarLoading() {
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('cardapio').classList.add('hidden');
}

// Função para ocultar loading
function ocultarLoading() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('cardapio').classList.remove('hidden');
}

// Função para mostrar erro detalhado - MODIFICADO O FUNDO AQUI
function mostrarErroDetalhado(mensagem) {
    document.body.innerHTML = `
                <div class="min-h-screen bg-[#3C85C2] flex items-center justify-center p-4"> 
                    <div class="text-center max-w-md">
                        <div class="text-6xl mb-4">❌</div>
                        <h2 class="text-2xl font-bold text-gray-800 mb-2">Erro ao carregar dados</h2>
                        <p class="text-gray-600 mb-4">${mensagem}</p>
                        <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left">
                            <h3 class="font-bold text-yellow-800 mb-2">🔍 Verifique:</h3>
                            <ul class="text-sm text-yellow-700 space-y-1">
                                <li>• As planilhas estão preenchidas com dados</li>
                                <li>• As planilhas estão publicadas na web</li>
                                <li>• Os cabeçalhos estão corretos</li>
                                <li>• Abra o console do navegador (F12) para mais detalhes</li>
                            </ul>
                        </div>
                        <button onclick="location.reload()" class="bg-#713E51-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600">
                            Tentar novamente
                        </button>
                    </div>
                </div>
            `;
}

// Função para verificar se o estabelecimento está aberto
function verificarHorarioFuncionamento() {
    const agora = new Date();
    const diaAtual = agora.getDay(); // 0 = Domingo, 1 = Segunda, etc.
    const horaAtual = agora.getHours();
    const minutoAtual = agora.getMinutes();
    const tempoAtual = horaAtual * 60 + minutoAtual; // Converter para minutos

    // Se não tiver horários específicos configurados, considerar sempre aberto
    if (!estabelecimento.horario_abertura || !estabelecimento.horario_fechamento) {
        return { aberto: true, motivo: '' };
    }

    // Verificar dias de funcionamento (se especificado)
    if (estabelecimento.dias_funcionamento && estabelecimento.dias_funcionamento.trim() !== '') {
        const diasPermitidos = estabelecimento.dias_funcionamento.toLowerCase().split(',').map(d => d.trim());
        const diasSemana = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
        const diaHoje = diasSemana[diaAtual];

        if (!diasPermitidos.includes(diaHoje) && !diasPermitidos.includes('todos')) {
            return {
                aberto: false,
                motivo: `Funcionamos apenas: ${estabelecimento.dias_funcionamento}`
            };
        }
    }

    // Converter horários de abertura e fechamento para minutos
    const [horaAbertura, minutoAbertura] = estabelecimento.horario_abertura.split(':').map(Number);
    const [horaFechamento, minutoFechamento] = estabelecimento.horario_fechamento.split(':').map(Number);

    const tempoAbertura = horaAbertura * 60 + minutoAbertura;
    const tempoFechamento = horaFechamento * 60 + minutoFechamento;

    // Verificar se está dentro do horário
    let estaAberto = false;

    if (tempoFechamento > tempoAbertura) {
        // Horário normal (ex: 09:00 às 18:00)
        estaAberto = tempoAtual >= tempoAbertura && tempoAtual <= tempoFechamento;
    } else {
        // Horário que cruza meia-noite (ex: 18:00 às 02:00)
        estaAberto = tempoAtual >= tempoAbertura || tempoAtual <= tempoFechamento;
    }

    if (!estaAberto) {
        return {
            aberto: false,
            motivo: `Horário de funcionamento: ${estabelecimento.horario_abertura} às ${estabelecimento.horario_fechamento}`
        };
    }

    return { aberto: true, motivo: '' };
}

// Função para carregar dados do estabelecimento na interface
function carregarEstabelecimento() {
    const nomeEstab = estabelecimento.nome || 'Nome não informado';

    // Header principal
    document.getElementById('nomeEstabelecimento').textContent = nomeEstab;
    document.getElementById('descricaoEstabelecimento').textContent = estabelecimento.descricao || '';
    document.getElementById('telefoneEstabelecimento').textContent = estabelecimento.telefone || '';
    document.getElementById('enderecoEstabelecimento').textContent = estabelecimento.endereco || '';

    // Header compacto
    document.getElementById('nomeCompacto').textContent = nomeEstab;

    // Mostrar status de funcionamento
    const statusFuncionamento = verificarHorarioFuncionamento();
    const horarioTexto = estabelecimento.horario || '';
    const statusTexto = statusFuncionamento.aberto ? '🟢 Aberto' : '🔴 Fechado';
    const statusTextoCompacto = statusFuncionamento.aberto ? '🟢 Aberto' : '🔴 Fechado';

    document.getElementById('horarioEstabelecimento').innerHTML = `${horarioTexto} ${statusTexto}`;
    document.getElementById('statusCompacto').textContent = statusTextoCompacto;

    // Atualizar carrinho e botões se estiver fechado
    if (!statusFuncionamento.aberto) {
        mostrarAvisoFechado(statusFuncionamento.motivo);
    }

    // Carregar logo se disponível
    if (estabelecimento.logo_url && estabelecimento.logo_url.trim() !== '') {
        const logoImg = document.getElementById('logoEstabelecimento');
        const logoCompacto = document.getElementById('logoCompacto');
        const logoConfig = converterUrlParaImagemDireta(estabelecimento.logo_url.trim());

        if (logoConfig) {
            if (logoConfig.tipo === 'google-drive') {
                // Logo principal
                logoImg.src = logoConfig.formatos[0];
                logoImg.onerror = function () {
                    let formatoAtual = logoConfig.formatos.findIndex(url => url === this.src);
                    if (formatoAtual < logoConfig.formatos.length - 1) {
                        this.src = logoConfig.formatos[formatoAtual + 1];
                    } else {
                        this.style.display = 'none';
                        document.getElementById('logoPlaceholder').style.display = 'flex';
                    }
                };

                // Logo compacto
                logoCompacto.src = logoConfig.formatos[0];
                logoCompacto.onload = function () {
                    document.getElementById('logoCompactoPlaceholder').style.display = 'none';
                    this.classList.remove('hidden');
                };
                logoCompacto.onerror = function () {
                    let formatoAtual = logoConfig.formatos.findIndex(url => url === this.src);
                    if (formatoAtual < logoConfig.formatos.length - 1) {
                        this.src = logoConfig.formatos[formatoAtual + 1];
                    } else {
                        this.style.display = 'none';
                        document.getElementById('logoCompactoPlaceholder').style.display = 'flex';
                    }
                };
            } else {
                logoImg.src = logoConfig.url;
                logoCompacto.src = logoConfig.url;
                logoCompacto.onload = function () {
                    document.getElementById('logoCompactoPlaceholder').style.display = 'none';
                    this.classList.remove('hidden');
                };
            }
        }
    }
}

// Função para formatar preço
function formatarPreco(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}

// FUNÇÃO renderizarCategorias() MODIFICADA: Remoção do "undefined"
function renderizarCategorias() {
    const categoriasNav = document.getElementById('categoriasNav');
    if (!categoriasNav) return;

    categoriasNav.innerHTML = '';

    categorias.forEach(categoria => {
        const botao = document.createElement('button');
        botao.className = `categoria-btn px-4 py-2 rounded-full font-medium whitespace-nowrap transition-all ${categoria.id == categoriaAtiva
                ? 'ativa'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`;
            
        // MUDANÇA AQUI: Garante que o ícone só apareça se estiver definido e não vazio
        const icone = categoria.icone && categoria.icone.trim() !== '' ? categoria.icone.trim() + ' ' : '';
        
        botao.textContent = `${icone}${categoria.nome}`;
        botao.onclick = () => {
            categoriaAtiva = parseInt(categoria.id);
            renderizarCategorias();
            renderizarItens();
        };
        categoriasNav.appendChild(botao);
    });
}

// FUNÇÃO renderizarItens() MODIFICADA: Remoção da exibição do preço
function renderizarItens() {
    const categoriaAtual = categoriasComItens.find(cat => cat.id == categoriaAtiva);
    const tituloCategoria = document.getElementById('tituloCategoria');
    const listaItens = document.getElementById('listaItens');

    if (!categoriaAtual || !tituloCategoria || !listaItens) return;

    tituloCategoria.innerHTML = `${categoriaAtual.icone} ${categoriaAtual.nome}`;
    listaItens.innerHTML = '';

    if (!categoriaAtual.itens || categoriaAtual.itens.length === 0) {
        listaItens.innerHTML = `
                    <div class="text-center py-8 text-gray-500">
                        <div class="text-4xl mb-2">🍽️</div>
                        <p>Nenhum item disponível nesta categoria</p>
                    </div>
                `;
        return;
    }

    categoriaAtual.itens.forEach(item => {
        // Verificar disponibilidade de forma mais robusta
        const itemDisponivel = item.disponivel === 'TRUE' || item.disponivel === true || item.disponivel === 'true';

        // Garantir que o preço seja um número
        let preco = 0;
        if (typeof item.preco === 'number') {
            preco = item.preco;
        } else if (typeof item.preco === 'string') {
            preco = parseFloat(item.preco.replace(',', '.')) || 0;
        }

        const precoFormatado = formatarPreco(preco);

        // ✨ PROCESSAR URL DA IMAGEM - COM SISTEMA DE FALLBACK
        let imagemConfig = null;
        if (item.imagem_url && item.imagem_url.trim() !== '') {
            const urlLimpa = item.imagem_url.trim();

            // PROCESSAR URL COM FUNÇÃO MELHORADA
            imagemConfig = converterUrlParaImagemDireta(urlLimpa);


        }

        const itemDiv = document.createElement('div');
        // MODIFICADO: Removidos 'w-64' e 'flex-shrink-0'. Agora usa a largura da coluna do grid.
        itemDiv.className = `item-card bg-white rounded-lg shadow-md overflow-hidden ${!itemDisponivel ? 'opacity-60' : ''}`;

        // 🔧 GERAR HTML DA IMAGEM COM SISTEMA DE FALLBACK
        let htmlImagem = '';
        if (imagemConfig) {
            if (imagemConfig.tipo === 'google-drive') {
                // Sistema de múltiplas tentativas para Google Drive
                const fallbackUrls = imagemConfig.formatos.map((url, index) =>
                    `this.src='${url}'; this.onerror=${index === imagemConfig.formatos.length - 1 ? 'mostrarErroImagem(this)' : 'null'};`
                ).join(' ');

                htmlImagem = `
                        <div class="h-64 bg-gray-50"> <img
                                src="${imagemConfig.formatos[0]}"
                                alt="${item.nome}"
                                class="w-full h-full object-contain p-2" onload=""
                                onerror="${fallbackUrls}"
                                loading="lazy"
                            />
                        </div>`;
            } else {
                // URL simples (Dropbox, URLs externas)
                htmlImagem = `
                        <div class="h-64 bg-gray-50"> <img
                                src="${imagemConfig.url}"
                                alt="${item.nome}"
                                class="w-full h-full object-contain p-2" onload=""
                                onerror="mostrarErroImagem(this);"
                                loading="lazy"
                            />
                        </div>`;
            }
        } else {
            htmlImagem = `
                    <div class="h-64 bg-gray-100 flex items-center justify-center"> <div class="text-center p-4">
                            <div class="text-4xl mb-2">🍽️</div>
                            <p class="text-gray-500 text-sm">Sem imagem</p>
                        </div>
                    </div>`;
        }

        itemDiv.innerHTML = `
                    ${htmlImagem}
                    <div class="p-4 flex flex-col justify-between h-[calc(100%-16rem)]"> <div class="flex-grow">
                            <h3 class="text-lg font-bold text-gray-800 truncate mb-1" title="${item.nome}">${item.nome}</h3>
                            <p class="text-sm text-gray-500 mb-3">${item.descricao || ''}</p>
                        </div>
                        <div class="mt-auto">
                            <div class="flex items-center justify-end"> 
                                ${itemDisponivel ?
                `<button 
                                        onclick="adicionarAoCarrinho(${item.id}, '${item.nome}', ${preco})" 
                                        class="btn-pedido bg-purple-500 text-white p-2 rounded-full hover:bg-purple-600 transition-colors"
                                    >
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
                                        </svg>
                                    </button>`
                :
                `<button disabled class="bg-gray-300 text-gray-500 p-2 rounded-full cursor-not-allowed">
                                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                                        </svg>
                                    </button>`
            }
                            </div>
                        </div>
                    </div>
                `;

        listaItens.appendChild(itemDiv);
    });

    // Reabilitar botões se estiver aberto e os botões estiverem desabilitados
    const statusFuncionamento = verificarHorarioFuncionamento();
    if (statusFuncionamento.aberto) {
        habilitarBotoesAdicionar();
    }
}

// Função para mostrar erro de carregamento de imagem
function mostrarErroImagem(imgElement) {
    imgElement.onerror = null; // Evita loop infinito de erro
    imgElement.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="w-full h-full text-gray-500"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L15 14l5-5"/></svg>';
    imgElement.classList.add('object-contain', 'p-4');
    imgElement.classList.remove('object-cover', 'p-0');
}

// Lógica de Carrinho (adição, remoção, cálculo)
function adicionarAoCarrinho(id, nome, preco) {
    const itemExistente = carrinho.find(item => item.id === id);

    if (itemExistente) {
        itemExistente.quantidade += 1;
    } else {
        carrinho.push({ id, nome, preco, quantidade: 1 });
    }

    renderizarCarrinho();
    mostrarFeedback(`"${nome}" adicionado ao carrinho!`, 'success');
}

function removerDoCarrinho(id) {
    const index = carrinho.findIndex(item => item.id === id);

    if (index !== -1) {
        carrinho.splice(index, 1);
        renderizarCarrinho();
        mostrarFeedback('Item removido do carrinho.', 'error');
    }
}

function diminuirQuantidade(id) {
    const itemExistente = carrinho.find(item => item.id === id);

    if (itemExistente) {
        itemExistente.quantidade -= 1;
        if (itemExistente.quantidade <= 0) {
            removerDoCarrinho(id);
        } else {
            renderizarCarrinho();
        }
    }
}

function limparCarrinho() {
    carrinho = [];
    renderizarCarrinho();
    fecharModalCarrinho();
    mostrarFeedback('Carrinho limpo!', 'error');
}

function calcularTotalCarrinho() {
    return carrinho.reduce((total, item) => total + item.preco * item.quantidade, 0);
}

function renderizarCarrinho() {
    const carrinhoFlutuante = document.getElementById('carrinhoFlutuante');
    const badgeQuantidade = document.getElementById('badgeQuantidade');
    const badgeTotal = document.getElementById('badgeTotal');
    const itensCarrinhoModal = document.getElementById('itensCarrinhoModal');
    const totalCarrinhoModal = document.getElementById('totalCarrinhoModal');
    const quantidadeItensModal = document.getElementById('quantidadeItensModal');
    const carrinhoVazio = document.getElementById('carrinhoVazio');
    const footerModal = document.getElementById('footerModal');

    if (carrinho.length === 0) {
        // Esconder carrinho flutuante
        carrinhoFlutuante.classList.add('hidden');
        // Mostrar estado vazio no modal
        carrinhoVazio.classList.remove('hidden');
        itensCarrinhoModal.classList.add('hidden');
        footerModal.classList.add('hidden');
        return;
    }

    // Mostrar carrinho flutuante
    carrinhoFlutuante.classList.remove('hidden');
    carrinhoVazio.classList.add('hidden');
    itensCarrinhoModal.classList.remove('hidden');
    footerModal.classList.remove('hidden');

    // Calcular totais
    let totalItens = 0;
    let totalPreco = 0;
    carrinho.forEach(item => {
        totalItens += item.quantidade;
        totalPreco += item.preco * item.quantidade;
    });

    // Atualizar badges do carrinho flutuante
    badgeQuantidade.textContent = totalItens;
    badgeTotal.textContent = formatarPreco(totalPreco);

    // Atualizar modal
    totalCarrinhoModal.textContent = formatarPreco(totalPreco);
    quantidadeItensModal.textContent = `${totalItens} item${totalItens !== 1 ? 's' : ''}`;

    // Renderizar itens no modal
    itensCarrinhoModal.innerHTML = '';
    carrinho.forEach(item => {
        const subtotal = item.preco * item.quantidade;
        const itemDiv = document.createElement('div');
        itemDiv.className = 'flex items-center gap-3 bg-gray-50 p-3 rounded-lg shadow-sm';
        itemDiv.innerHTML = `
                <div class="flex-grow">
                    <h5 class="font-bold text-gray-800">${item.nome}</h5>
                    <p class="text-sm text-gray-500">${item.quantidade} x ${formatarPreco(item.preco)}</p>
                </div>
                <div class="text-lg font-bold text-green-600 flex-shrink-0">${formatarPreco(subtotal)}</div>
                <div class="flex items-center gap-1 flex-shrink-0">
                    <button onclick="diminuirQuantidade(${item.id})" class="text-red-500 hover:text-red-700 bg-white p-1 rounded-full border">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"></path></svg>
                    </button>
                    <span class="font-bold text-sm text-gray-700 w-6 text-center">${item.quantidade}</span>
                    <button onclick="adicionarAoCarrinho(${item.id}, '${item.nome}', ${item.preco})" class="text-green-500 hover:text-green-700 bg-white p-1 rounded-full border">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                    </button>
                </div>
            `;
        itensCarrinhoModal.appendChild(itemDiv);
    });

    // Atualizar resumo no modal de entrega (se estiver aberto)
    const modalEntrega = document.getElementById('modalEntrega');
    if (modalEntrega && !modalEntrega.classList.contains('hidden')) {
        atualizarResumoPedido();
    }
}

// Lógica de Modais
function abrirModalCarrinho() {
    const modal = document.getElementById('modalCarrinho');
    renderizarCarrinho(); // Garante que o carrinho esteja atualizado ao abrir
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
}

function fecharModalCarrinho() {
    const modal = document.getElementById('modalCarrinho');
    modal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
}

function abrirModalEntrega() {
    if (carrinho.length === 0) {
        mostrarFeedback('Adicione itens ao carrinho primeiro!', 'error');
        return;
    }

    fecharModalCarrinho();
    const modal = document.getElementById('modalEntrega');
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    
    // Inicializar o tipo de pedido e pagamento
    selecionarTipoPedido(tipoPedidoAtual);
    if (formaPagamentoAtual) {
        selecionarPagamento(formaPagamentoAtual);
    }

    atualizarResumoPedido();
    // Tenta preencher os campos se houver dados salvos
    carregarDadosFormulario();
}

function fecharModalEntrega() {
    const modal = document.getElementById('modalEntrega');
    modal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
}

// Lógica de Formulário de Pedido
function selecionarTipoPedido(tipo) {
    tipoPedidoAtual = tipo;
    const btnEntrega = document.getElementById('btnEntrega');
    const btnRetirada = document.getElementById('btnRetirada');
    const enderecoSection = document.getElementById('enderecoSection');
    const btnEnviarPedido = document.getElementById('btnEnviarPedido');

    btnEntrega.classList.remove('border-blue-300', 'bg-blue-50');
    btnEntrega.classList.add('border-transparent', 'bg-gray-100', 'hover:bg-gray-200');
    btnRetirada.classList.remove('border-blue-300', 'bg-blue-50');
    btnRetirada.classList.add('border-transparent', 'bg-gray-100', 'hover:bg-gray-200');

    if (tipo === 'entrega') {
        btnEntrega.classList.add('border-blue-300', 'bg-blue-50');
        btnEntrega.classList.remove('border-transparent', 'bg-gray-100', 'hover:bg-gray-200');
        enderecoSection.classList.remove('hidden');
        btnEnviarPedido.textContent = '🚚 Confirmar Pedido (Entrega)';
    } else {
        btnRetirada.classList.add('border-blue-300', 'bg-blue-50');
        btnRetirada.classList.remove('border-transparent', 'bg-gray-100', 'hover:bg-gray-200');
        enderecoSection.classList.add('hidden');
        btnEnviarPedido.textContent = '🏪 Confirmar Pedido (Retirada)';
    }
}

function selecionarPagamento(forma) {
    formaPagamentoAtual = forma;
    const botoes = document.querySelectorAll('.pagamento-btn');
    const dinheiroTroco = document.getElementById('dinheiroTroco');

    botoes.forEach(btn => {
        btn.classList.remove('border-green-300', 'bg-green-50');
        btn.classList.add('border-transparent', 'bg-gray-100', 'hover:bg-gray-50');
    });

    const btnAtivo = Array.from(botoes).find(btn => btn.onclick.includes(`'${forma}'`));
    if (btnAtivo) {
        btnAtivo.classList.add('border-green-300', 'bg-green-50');
    }

    if (forma === 'dinheiro') {
        dinheiroTroco.classList.remove('hidden');
    } else {
        dinheiroTroco.classList.add('hidden');
    }
}

function atualizarResumoPedido() {
    const resumoModal = document.getElementById('resumoPedidoModal');
    const totalResumoModal = document.getElementById('totalResumoModal');
    const total = calcularTotalCarrinho();
    const resumoItens = carrinho.map(item => `
        <div class="flex justify-between">
            <span class="font-semibold">${item.quantidade}x ${item.nome}</span>
            <span>${formatarPreco(item.preco * item.quantidade)}</span>
        </div>
    `).join('');

    resumoModal.innerHTML = `
        ${resumoItens}
        <div class="flex justify-between font-bold pt-2 mt-2 border-t border-gray-200">
            <span>Subtotal:</span>
            <span>${formatarPreco(total)}</span>
        </div>
        `;

    // Atualiza o total final, incluindo taxas se houver
    totalResumoModal.textContent = formatarPreco(total); 
}

function validarFormulario() {
    const nome = document.getElementById('nomeCliente').value.trim();
    const telefone = document.getElementById('telefoneCliente').value.trim();
    const formaPagamento = formaPagamentoAtual;

    if (!nome || !telefone || !formaPagamento) {
        mostrarFeedback('Por favor, preencha nome, telefone e selecione a forma de pagamento.', 'error');
        return false;
    }

    if (tipoPedidoAtual === 'entrega') {
        const rua = document.getElementById('ruaCliente').value.trim();
        const numero = document.getElementById('numeroCliente').value.trim();
        const bairro = document.getElementById('bairroCliente').value.trim();
        const cidade = document.getElementById('cidadeCliente').value.trim();
        if (!rua || !numero || !bairro || !cidade) {
            mostrarFeedback('Para entrega, preencha o endereço completo (Rua, Nº, Bairro, Cidade).', 'error');
            return false;
        }
    }

    return true;
}

// Salva dados no LocalStorage (opcional, para conveniência do usuário)
function salvarDadosFormulario() {
    const dados = {
        nome: document.getElementById('nomeCliente').value,
        telefone: document.getElementById('telefoneCliente').value,
        cep: document.getElementById('cepCliente').value,
        rua: document.getElementById('ruaCliente').value,
        numero: document.getElementById('numeroCliente').value,
        complemento: document.getElementById('complementoCliente').value,
        bairro: document.getElementById('bairroCliente').value,
        cidade: document.getElementById('cidadeCliente').value,
        referencia: document.getElementById('referenciaCliente').value
    };
    localStorage.setItem('dadosCliente', JSON.stringify(dados));
    localStorage.setItem('tipoPedido', tipoPedidoAtual);
    localStorage.setItem('formaPagamento', formaPagamentoAtual);
}

function carregarDadosFormulario() {
    const dadosString = localStorage.getItem('dadosCliente');
    if (dadosString) {
        const dados = JSON.parse(dadosString);
        document.getElementById('nomeCliente').value = dados.nome || '';
        document.getElementById('telefoneCliente').value = dados.telefone || '';
        document.getElementById('cepCliente').value = dados.cep || '';
        document.getElementById('ruaCliente').value = dados.rua || '';
        document.getElementById('numeroCliente').value = dados.numero || '';
        document.getElementById('complementoCliente').value = dados.complemento || '';
        document.getElementById('bairroCliente').value = dados.bairro || '';
        document.getElementById('cidadeCliente').value = dados.cidade || '';
        document.getElementById('referenciaCliente').value = dados.referencia || '';
    }

    const tipo = localStorage.getItem('tipoPedido');
    if (tipo) selecionarTipoPedido(tipo);

    const pagamento = localStorage.getItem('formaPagamento');
    if (pagamento) selecionarPagamento(pagamento);
}

// Função para buscar CEP (simulação/exemplo)
async function buscarCEP() {
    const cep = document.getElementById('cepCliente').value.replace(/\D/g, '');
    if (cep.length !== 8) return;

    try {
        mostrarFeedback('Buscando CEP...', 'info');
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();

        if (data.erro) {
            mostrarFeedback('CEP não encontrado.', 'error');
            return;
        }

        document.getElementById('ruaCliente').value = data.logradouro || '';
        document.getElementById('bairroCliente').value = data.bairro || '';
        document.getElementById('cidadeCliente').value = `${data.localidade} / ${data.uf}` || '';
        
        mostrarFeedback('CEP preenchido com sucesso!', 'success');
        document.getElementById('numeroCliente').focus();

    } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        mostrarFeedback('Erro ao buscar CEP. Preencha manualmente.', 'error');
    }
}


function construirMensagemWhatsApp() {
    const nome = document.getElementById('nomeCliente').value.trim();
    const telefone = document.getElementById('telefoneCliente').value.trim();
    const observacoes = document.getElementById('observacoesCliente').value.trim();
    const total = calcularTotalCarrinho();
    const troco = formaPagamentoAtual === 'dinheiro' ? document.getElementById('trocoCliente').value.trim() : '';
    const nomeEstab = estabelecimento.nome || 'Estabelecimento';

    let mensagem = `*PEDIDO ONLINE* - ${nomeEstab}\n\n`;

    // 1. Tipo de Pedido e Dados do Cliente
    mensagem += `*Tipo:* ${tipoPedidoAtual === 'entrega' ? '🚚 Entrega' : '🏪 Retirada no Local'}\n`;
    mensagem += `*Cliente:* ${nome}\n`;
    mensagem += `*Telefone:* ${telefone}\n`;

    // 2. Endereço (se for entrega)
    if (tipoPedidoAtual === 'entrega') {
        const rua = document.getElementById('ruaCliente').value.trim();
        const numero = document.getElementById('numeroCliente').value.trim();
        const complemento = document.getElementById('complementoCliente').value.trim();
        const bairro = document.getElementById('bairroCliente').value.trim();
        const cidade = document.getElementById('cidadeCliente').value.trim();
        const referencia = document.getElementById('referenciaCliente').value.trim();
        
        mensagem += `\n*Endereço:*\n`;
        mensagem += `📍 ${rua}, Nº ${numero}${complemento ? `, ${complemento}` : ''}\n`;
        mensagem += `*Bairro/Cidade:* ${bairro}, ${cidade}\n`;
        if (referencia) mensagem += `*Ref:* ${referencia}\n`;
    }

    // 3. Itens do Pedido
    mensagem += `\n*ITENS DO PEDIDO*:\n`;
    carrinho.forEach(item => {
        mensagem += `${item.quantidade}x ${item.nome} (${formatarPreco(item.preco * item.quantidade)})\n`;
    });
    
    // 4. Totais
    mensagem += `\n*SUBTOTAL: ${formatarPreco(total)}*\n`;
    
    // 5. Pagamento
    mensagem += `*Pagamento:* ${formaPagamentoAtual.toUpperCase()}\n`;
    if (troco) mensagem += `*Precisa de troco para:* ${troco}\n`;

    // 6. Observações
    if (observacoes) {
        mensagem += `\n*Observações:*\n${observacoes}\n`;
    }

    mensagem += '\nObrigado pelo seu pedido! 😉';

    return encodeURIComponent(mensagem);
}

function enviarPedidoEntrega() {
    if (!validarFormulario()) {
        return;
    }

    // Salva dados para o próximo pedido
    salvarDadosFormulario();

    const numeroTelefoneEstabelecimento = estabelecimento.telefone.replace(/\D/g, ''); // Limpa o número
    const mensagem = construirMensagemWhatsApp();
    
    const url = `https://api.whatsapp.com/send?phone=${numeroTelefoneEstabelecimento}&text=${mensagem}`;

    // Abrir o WhatsApp
    window.open(url, '_blank');
    
    // Mostrar feedback e fechar modal
    mostrarFeedback('Pedido enviado! Verifique o WhatsApp.', 'success');
    fecharModalEntrega();
    limparCarrinho();
}


// Funções de feedback e utilitárias
function mostrarFeedback(mensagem, tipo) {
    // Cria um elemento de notificação flutuante temporário
    const notificacao = document.createElement('div');
    notificacao.className = `fixed bottom-20 left-1/2 transform -translate-x-1/2 p-3 rounded-lg shadow-xl text-white font-semibold transition-all duration-300 z-50`;
    
    if (tipo === 'success') {
        notificacao.classList.add('bg-green-500');
    } else if (tipo === 'error') {
        notificacao.classList.add('bg-red-500');
    } else { // info
        notificacao.classList.add('bg-blue-500');
    }
    
    notificacao.textContent = mensagem;

    document.body.appendChild(notificacao);

    // Fade out e remover
    setTimeout(() => {
        notificacao.style.opacity = '0';
        notificacao.style.transform = 'translate(-50%, 20px)';
        setTimeout(() => {
            notificacao.remove();
        }, 500);
    }, 2500);
}

function mostrarAvisoFechado(motivo) {
    mostrarFeedback(`🔴 ${motivo}. Pedidos estão desabilitados no momento.`, 'error');
    desabilitarBotoesAdicionar();
    // Esconder carrinho flutuante
    document.getElementById('carrinhoFlutuante').classList.add('hidden');
    // Desabilitar botão de pedido no modal
    const btnEnviar = document.getElementById('btnEnviarPedido');
    if (btnEnviar) btnEnviar.disabled = true;
}

function desabilitarBotoesAdicionar() {
    const botoes = document.querySelectorAll('.btn-pedido');
    botoes.forEach(btn => {
        btn.disabled = true;
        btn.classList.add('bg-gray-300', 'text-gray-500', 'cursor-not-allowed');
        btn.classList.remove('bg-purple-500', 'hover:bg-purple-600', 'text-white');
    });
}

function habilitarBotoesAdicionar() {
    const botoes = document.querySelectorAll('.btn-pedido');
    botoes.forEach(btn => {
        // Verifica se o item original está disponível na planilha (a opacidade verifica isso)
        if (!btn.closest('.item-card').classList.contains('opacity-60')) {
            btn.disabled = false;
            btn.classList.remove('bg-gray-300', 'text-gray-500', 'cursor-not-allowed');
            btn.classList.add('bg-purple-500', 'hover:bg-purple-600', 'text-white');
        }
    });
    // Habilita botão de pedido no modal
    const btnEnviar = document.getElementById('btnEnviarPedido');
    if (btnEnviar) btnEnviar.disabled = false;
}

// Lógica para esconder/mostrar header compacto (mobile)
window.onscroll = function () {
    const headerCompacto = document.getElementById('headerCompacto');
    const headerPrincipal = document.getElementById('headerPrincipal');

    if (!headerPrincipal || !headerCompacto) return;

    if (window.scrollY > headerPrincipal.offsetHeight) {
        headerCompacto.classList.add('visivel');
    } else {
        headerCompacto.classList.remove('visivel');
    }
};

// Lógica para QR Code (simulação)
function obterNumeroMesa() {
    const params = new URLSearchParams(window.location.search);
    const mesa = params.get('mesa');
    if (mesa) {
        numeroMesa = mesa;
        tipoPedidoAtual = 'mesa';
        document.getElementById('btnEntrega').style.display = 'none';
        document.getElementById('btnRetirada').style.display = 'none';
        document.getElementById('enderecoSection').style.display = 'none';
        document.getElementById('btnEnviarPedido').textContent = '✅ Finalizar Pedido na Mesa';

        // Oculta o carrinho flutuante e mostra apenas o botão de pedido no modal se for para mesa
        document.getElementById('carrinhoFlutuante').classList.add('hidden');
    }
}

function mostrarInfoMesa() {
    if (!numeroMesa) return;

    // Criar elemento de informação da mesa
    const infoMesa = document.createElement('div');
    infoMesa.className = 'bg-blue-500 text-white text-center py-2 px-4';
    infoMesa.innerHTML = `
                <div class="flex items-center justify-center gap-2">
                    <span class="text-lg">🪑</span>
                    <span class="font-bold">Mesa ${numeroMesa}</span>
                </div>
            `;

    // Inserir após o header principal
    const headerPrincipal = document.getElementById('headerPrincipal');
    headerPrincipal.parentNode.insertBefore(infoMesa, headerPrincipal.nextSibling);

    // Adicionar também no header compacto
    const statusCompacto = document.getElementById('statusCompacto');
    const infoMesaCompacta = document.createElement('div');
    infoMesaCompacta.className = 'text-xs font-medium bg-blue-500 text-white px-2 py-1 rounded-full ml-2';
    infoMesaCompacta.innerHTML = `🪑 Mesa ${numeroMesa}`;
    statusCompacto.parentNode.insertBefore(infoMesaCompacta, statusCompacto.nextSibling);
}

// Inicializar aplicação
obterNumeroMesa();
carregarDados();

// Mostrar info da mesa após carregar
setTimeout(() => {
    mostrarInfoMesa();
}, 500);

// Iniciar verificação de status a cada 60 segundos (opcional, para horário)
setInterval(carregarEstabelecimento, 60000);