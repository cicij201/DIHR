// renderDOM 함수 내의 버튼 생성 로직 부분만 확인하세요
boardData.forEach((column, colIdx) => {
    // ... (중략) ...
    colNode.innerHTML = `
        <div class="header">
            <h1 contenteditable="false" class="col-title">
                <span contenteditable="true" class="title-text">${column.title}</span>
                <span class="badge">${column.items ? column.items.length : 0}</span>
            </h1>
            <div class="header-btns">
                <button class="icon-btn collapse-btn" title="접기/펴기">
                    ${column.collapsed ? '▼' : '▲'}
                </button>
                <button class="icon-btn archive-btn" title="보관">📦</button>
                <button class="icon-btn delete-btn" title="삭제">×</button>
            </div>
        </div>
        <div class="color-picker" style="display:flex; gap:4px; padding:5px 12px;">
            ${['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#94a3b8'].map(c => 
                `<div class="color-dot" style="background:${c}; width:10px; height:10px; border-radius:50%; cursor:pointer;"></div>`
            ).join('')}
        </div>
        <div class="custom-scroll"><ul class="drag-item-list"></ul></div>
        <div class="add-btn-group" style="padding:10px;">
            <button class="add-item-btn" style="width:100%; border:1px dashed #cbd5e1; background:white; padding:5px; border-radius:4px; cursor:pointer;">+ 추가</button>
        </div>
    `;

    // 제목 수정 로직 보완
    const titleEl = colNode.querySelector('.title-text');
    titleEl.onblur = () => {
        boardData[colIdx].title = titleEl.textContent;
        saveToServer();
    };

    // 접기 버튼 이벤트 (전파 차단 추가)
    colNode.querySelector('.collapse-btn').onclick = (e) => {
        e.stopPropagation(); // 드래그 이벤트와 겹치지 않게 방지
        boardData[colIdx].collapsed = !boardData[colIdx].collapsed;
        saveToServer();
    };
    // ... (이하 동일) ...
});
