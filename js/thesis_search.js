const searchBotton = $('#mysearch')
const searchApi = "https://api.semanticscholar.org/graph/v1/paper/search?query="
const paperInfoApi = "https://api.semanticscholar.org/graph/v1/paper/"

const symbolSizeMax = 60.00;
const symbolSizeMin = 30.00;
const localMax = 500.00;
const localMin = -500.00;

const depthNum = 2;

const loaderAnime = '<div class="loader-outside"><div class="loader"><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div></div></div>'

function thesis_search(inputText) {
    inputText = inputText.trim().split(' ').join('+')
    Swal.fire({
        title: "<h4 style=\"margin: 20px;\">正在搜索, 请稍等...</h4>",
        showConfirmButton: false
    })
    $.ajax({
        url: searchApi + inputText + "&offset=0&limit=10&fields=title,authors,abstract,citationCount",
        type: 'GET',
        success: function (data, status) {
            console.log(data);
            let resultHtml = "<div class='search-result'>"
            data.data.forEach((element, index) => {
                let nodeHtml = `<div class='search-result-child' id="${element.paperId}" onclick="visualization(this)" title="引用关系可视化分析">`;
                nodeHtml += '<h4>' + element.title + '</h4>';
                nodeHtml += '<div class="authors">'
                element.authors.forEach(element => {
                    nodeHtml += '<span>' + element.name + '</span>'
                })
                let abstracts = element.abstract
                if (abstracts !== null) {
                    if (abstracts.length > 400) {
                        abstracts = abstracts.slice(0, 400);
                        abstracts += '...'
                    }
                } else {
                    abstracts = ''
                }
                nodeHtml += '</div><span class="page-abstract" style="font-size: 1em;text-align: left;color: #000;">' +
                    abstracts +
                    '</span><span class="page-citations" style="font-size: 0.6em;text-align: left;color: #5a94ce;">' +
                    "<i class=\"fa fa-quote-left\" style=\"padding: 0 5px;\"></i><span>" + element.citationCount + "</span>" +
                    '</span></div>';
                resultHtml += nodeHtml;
            });
            resultHtml += '</div>'
            Swal.fire({
                title: `一共有<span style='color: red;margin: 0 5px'>${data.total}</span>篇相关结果`,
                html: resultHtml,
                width: '80%',
                showConfirmButton: false
            })
        },
        error: function (status) {
            Swal.fire('Error', status, 'error');
        }
    })
}

searchBotton.bind("keypress", (event) => {
    if (event.keyCode === 13) {
        thesis_search(searchBotton.val());
    }
})

async function visualization(e) {
    let pageTitle = $(e).children("h4").html();
    let parentPaperId = $(e).attr('id');
    let parentCitations = $(e).children(".page-citations").children("span").html();
    let graphData = { "nodes": [], "links": [], "categories": [] };
    Swal.fire({
        title: "可视化数据构建中...",
        html: loaderAnime,
        showConfirmButton: false
    })
    // 主节点
    let firstNode = {
        "id": `${parentPaperId}`,
        "name": pageTitle,
        "symbolSize": Math.random() * (symbolSizeMax - symbolSizeMin + 1) + symbolSizeMin,
        "x": Math.random() * (localMax - localMin + 1) + localMin,
        "y": Math.random() * (localMax - localMin + 1) + localMin,
        "value": "引用数: " + parentCitations,
        "category": 0
    }
    graphData["nodes"].push(firstNode);
    for (let index = 0; index < depthNum; index++) {
        graphData["categories"].push({ "name": `depth: ${index}` });
    }
    await createCitationRelation(graphData, parentPaperId, 0);
    console.log(graphData['nodes'].length);
    console.log(graphData);
    Swal.fire({
        html: '<div class="thesis-visualization-outside"><div id="main" class="thesis-visualization"></div></div>',
        width: '90%',
        showConfirmButton: false
    });
    echarts_draw(graphData);
}

// 获取所有引用该论文的论文信息
async function citationsInfo(paperId) {
    let pageCitation = '';
    await $.ajax({
        url: paperInfoApi + paperId + "?fields=title,citations.title,citations.authors",
        type: 'GET',
        success: data => {
            pageCitation = data;
        }
    })
    return pageCitation;
}

// 建立论文引用关系
async function createCitationRelation(graphData, parentPaperId, loopDepth) {
    if (loopDepth > depthNum - 1) {
        return;
    }
    await citationsInfo(parentPaperId).then(async data => {
        for (let index = 0; index < data.citations.length + 1; index++) {
            const ci = data.citations[index];
            if (index === 6 || index === data.citations.length) {
                break;
            }
            if (typeof (graphData["nodes"].find(element => element.id === ci.paperId)) !== 'undefined') {
                continue;
            }
            let pageAuthors = ''
            for (let index = 0; index < ci.authors.length; index++) {
                if (index === 2) {
                    break;
                }
                pageAuthors += ci.authors[index].name + ",";
            }
            let node = {
                "id": `${ci.paperId}`,
                "name": ci.title,
                "symbolSize": Math.random() * (symbolSizeMax - symbolSizeMin + 1) + symbolSizeMin,
                "x": Math.random() * (localMax - localMin + 1) + localMin,
                "y": Math.random() * (localMax - localMin + 1) + localMin,
                "value": pageAuthors,
                "category": loopDepth
            }
            let link = {
                "source": ci.paperId,
                "target": parentPaperId
            }
            graphData["links"].push(link);
            graphData["nodes"].push(node);
            await createCitationRelation(graphData, ci.paperId, loopDepth + 1);
        }
    });
}