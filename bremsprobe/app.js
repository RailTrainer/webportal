// Bremsprobe-Baukasten Frontend Application
(function () {
  'use strict';

  const state = {
    mode: 'student', // 'student' | 'trainer'
    blocks: [],
    exercises: [],
    currentExerciseId: null,
    // Student placements per exerciseId: { [exerciseId]: { "row-col": blockId } }
    studentBoards: {},
    // Evaluation results for current student board: { "row-col": 'correct' | 'wrong' | 'missing' } | null
    evaluation: null,
    showingSolutionPreview: false,
    // Selected tool in palette: blockId or 'ERASER'
    activeTool: null,
    // Drag-span state (Start cell -> Current hovered cell -> End cell)
    dragSpan: null, // { startRow, startCol, endRow, endCol, action: 'set'|'erase', moved: boolean }
    // Modal state
    editingVehicleIdx: null,
    editingBlockId: null,
    completedExercises: JSON.parse(localStorage.getItem('bp_completed_exercises') || '{}')
  };

  // DOM Elements
  const el = {
    btnModeStudent: document.getElementById('btnModeStudent'),
    btnModeTrainer: document.getElementById('btnModeTrainer'),
    btnExportJson: document.getElementById('btnExportJson'),
    inputImportJson: document.getElementById('inputImportJson'),
    trainerExerciseActions: document.getElementById('trainerExerciseActions'),
    btnNewExercise: document.getElementById('btnNewExercise'),
    btnDuplicateExercise: document.getElementById('btnDuplicateExercise'),
    exerciseSelect: document.getElementById('exerciseSelect'),
    btnNewBlock: document.getElementById('btnNewBlock'),
    blockPalette: document.getElementById('blockPalette'),
    btnEraserTool: document.getElementById('btnEraserTool'),
    toastBanner: document.getElementById('toastBanner'),
    studentHeaderView: document.getElementById('studentHeaderView'),
    trainerHeaderView: document.getElementById('trainerHeaderView'),
    studentExerciseTitle: document.getElementById('studentExerciseTitle'),
    studentExerciseDesc: document.getElementById('studentExerciseDesc'),
    inputExerciseTitle: document.getElementById('inputExerciseTitle'),
    inputExerciseDesc: document.getElementById('inputExerciseDesc'),
    btnDeleteExercise: document.getElementById('btnDeleteExercise'),
    btnSaveExercise: document.getElementById('btnSaveExercise'),
    studentToolbar: document.getElementById('studentToolbar'),
    trainerToolbar: document.getElementById('trainerToolbar'),
    btnCheckSolution: document.getElementById('btnCheckSolution'),
    btnClearBoard: document.getElementById('btnClearBoard'),
    btnShowSolution: document.getElementById('btnShowSolution'),
    btnAddWagon: document.getElementById('btnAddWagon'),
    btnRemoveWagon: document.getElementById('btnRemoveWagon'),
    btnAddTfz: document.getElementById('btnAddTfz'),
    btnAddRow: document.getElementById('btnAddRow'),
    btnClearTrainerGrid: document.getElementById('btnClearTrainerGrid'),
    activeBrushIndicator: document.getElementById('activeBrushIndicator'),
    checkResultBox: document.getElementById('checkResultBox'),
    trainerDiagramHint: document.getElementById('trainerDiagramHint'),
    diagramBoard: document.getElementById('diagramBoard'),
    btnAddPrerequisite: document.getElementById('btnAddPrerequisite'),
    studentPrerequisitesList: document.getElementById('studentPrerequisitesList'),
    trainerPrerequisitesEditor: document.getElementById('trainerPrerequisitesEditor'),
    // Vehicle Modal
    modalVehicle: document.getElementById('modalVehicle'),
    btnCloseVehicleModal: document.getElementById('btnCloseVehicleModal'),
    selectVehicleType: document.getElementById('selectVehicleType'),
    inputVehicleLabel: document.getElementById('inputVehicleLabel'),
    selectVehicleDirection: document.getElementById('selectVehicleDirection'),
    checkCouplingAfter: document.getElementById('checkCouplingAfter'),
    inputCouplingLabel: document.getElementById('inputCouplingLabel'),
    btnDeleteVehicle: document.getElementById('btnDeleteVehicle'),
    btnCancelVehicleModal: document.getElementById('btnCancelVehicleModal'),
    btnApplyVehicleModal: document.getElementById('btnApplyVehicleModal'),
    // Block Modal
    modalBlock: document.getElementById('modalBlock'),
    modalBlockTitle: document.getElementById('modalBlockTitle'),
    btnCloseBlockModal: document.getElementById('btnCloseBlockModal'),
    inputBlockLabel: document.getElementById('inputBlockLabel'),
    inputBlockName: document.getElementById('inputBlockName'),
    inputBlockBgColor: document.getElementById('inputBlockBgColor'),
    inputBlockTextColor: document.getElementById('inputBlockTextColor'),
    checkBlockTall: document.getElementById('checkBlockTall'),
    inputBlockDesc: document.getElementById('inputBlockDesc'),
    blockModalPreview: document.getElementById('blockModalPreview'),
    btnDeleteBlock: document.getElementById('btnDeleteBlock'),
    btnCancelBlockModal: document.getElementById('btnCancelBlockModal'),
    btnSaveBlockModal: document.getElementById('btnSaveBlockModal')
  };

  // Helper: Find current exercise
  function getCurrentExercise() {
    return state.exercises.find((e) => e.id === state.currentExerciseId) || null;
  }

  // Helper: Find block by ID
  function getBlockById(blockId) {
    return state.blocks.find((b) => b.id === blockId) || null;
  }

  // Helper: Get active board placement map ("row-col" -> blockId)
  function getActivePlacements() {
    const ex = getCurrentExercise();
    if (!ex) return {};
    if (state.mode === 'trainer') {
      if (!ex.solution) ex.solution = {};
      return ex.solution;
    }
    if (state.showingSolutionPreview) {
      return ex.solution || {};
    }
    if (!state.studentBoards[ex.id]) {
      state.studentBoards[ex.id] = {};
    }
    return state.studentBoards[ex.id];
  }

  let toastTimeout = null;
  function showToast(msg) {
    el.toastBanner.textContent = msg;
    el.toastBanner.classList.remove('hidden');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      el.toastBanner.classList.add('hidden');
    }, 3200);
  }

  // Load initial data from backend
  async function initApp() {
    try {
      const res = await fetch('/api/bremsprobe/data');
      const data = await res.json();
      state.blocks = data.blocks || [];
      state.exercises = data.exercises || [];
      if (state.exercises.length > 0) {
        state.currentExerciseId = state.exercises[0].id;
      }
      if (state.blocks.length > 0) {
        state.activeTool = state.blocks[0].id;
      }
      bindEvents();
      renderAll();
    } catch (err) {
      console.error('Fehler beim Laden der Daten:', err);
      showToast('⚠️ Fehler beim Verbinden mit dem Server.');
    }
  }

  function renderAll() {
    renderModeUI();
    renderExerciseList();
    renderPalette();
    renderWorkspaceHeader();
    renderDiagram();
    renderPrerequisites();
    renderActiveBrushIndicator();
  }

  function renderModeUI() {
    const isTrainer = state.mode === 'trainer';
    el.btnModeStudent.classList.toggle('active', !isTrainer);
    el.btnModeTrainer.classList.toggle('active', isTrainer);

    el.trainerExerciseActions.classList.toggle('hidden', !isTrainer);
    el.btnNewBlock.classList.toggle('hidden', !isTrainer);
    el.studentHeaderView.classList.toggle('hidden', isTrainer);
    el.trainerHeaderView.classList.toggle('hidden', !isTrainer);
    el.studentToolbar.classList.toggle('hidden', isTrainer);
    el.trainerToolbar.classList.toggle('hidden', !isTrainer);
    el.trainerDiagramHint.classList.toggle('hidden', !isTrainer);
    el.btnAddPrerequisite.classList.toggle('hidden', !isTrainer);
    el.studentPrerequisitesList.classList.toggle('hidden', isTrainer);
    el.trainerPrerequisitesEditor.classList.toggle('hidden', !isTrainer);
    el.diagramBoard.classList.toggle('trainer-mode', isTrainer);

    if (isTrainer) {
      state.evaluation = null;
      state.showingSolutionPreview = false;
      el.checkResultBox.classList.add('hidden');
    }
  }

  function renderExerciseList() {
    if (!el.exerciseSelect) return;
    el.exerciseSelect.innerHTML = '';
    state.exercises.forEach((ex, index) => {
      const opt = document.createElement('option');
      opt.value = ex.id;
      const checkPrefix = state.completedExercises[ex.id] ? '✅ ' : '';
      opt.textContent = `${checkPrefix}${index + 1}. ${ex.title}`;
      if (ex.id === state.currentExerciseId) {
        opt.selected = true;
      }
      el.exerciseSelect.appendChild(opt);
    });
  }

  function renderPalette() {
    el.blockPalette.innerHTML = '';
    const isTrainer = state.mode === 'trainer';

    state.blocks.forEach((block) => {
      const item = document.createElement('div');
      item.className = 'palette-item' + (state.activeTool === block.id ? ' selected' : '');
      item.draggable = true;

      // Chip representation
      const chip = document.createElement('div');
      chip.className = 'palette-block-chip' + (block.tall ? ' tall' : '');
      chip.style.backgroundColor = block.bgColor;
      chip.style.color = block.textColor || '#000000';
      chip.textContent = block.label;

      const info = document.createElement('div');
      info.className = 'palette-item-info';

      const name = document.createElement('div');
      name.className = 'palette-item-name';
      name.textContent = block.name;

      const desc = document.createElement('div');
      desc.className = 'palette-item-desc';
      desc.textContent = block.description || '';

      info.appendChild(name);
      if (block.description) info.appendChild(desc);

      item.appendChild(chip);
      item.appendChild(info);

      if (isTrainer) {
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'palette-edit-btn';
        editBtn.textContent = '⚙️';
        editBtn.title = 'Baustein bearbeiten';
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openBlockModal(block.id);
        });
        item.appendChild(editBtn);
      }

      // Click to select as active brush tool
      item.addEventListener('click', () => {
        state.activeTool = block.id;
        renderPalette();
        renderActiveBrushIndicator();
      });

      // Drag start
      item.addEventListener('dragstart', (e) => {
        state.activeTool = block.id;
        e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'palette-block', blockId: block.id }));
        renderPalette();
        renderActiveBrushIndicator();
      });

      el.blockPalette.appendChild(item);
    });

    el.btnEraserTool.classList.toggle('selected', state.activeTool === 'ERASER');
  }

  function renderActiveBrushIndicator() {
    el.activeBrushIndicator.innerHTML = '';
    if (state.activeTool === 'ERASER') {
      el.activeBrushIndicator.innerHTML = '<span>Aktives Werkzeug: <strong>🧹 Radierer</strong> (Klicken/Ziehen zum Entfernen)</span>';
      return;
    }
    const block = getBlockById(state.activeTool);
    if (!block) {
      el.activeBrushIndicator.innerHTML = '<span>Kein Baustein gewählt</span>';
      return;
    }
    const dot = document.createElement('span');
    dot.style.display = 'inline-flex';
    dot.style.alignItems = 'center';
    dot.style.justifyContent = 'center';
    dot.style.padding = '1px 7px';
    dot.style.border = '1.5px solid #000';
    dot.style.fontWeight = '700';
    dot.style.fontSize = '0.78rem';
    dot.style.backgroundColor = block.bgColor;
    dot.style.color = block.textColor || '#000';
    dot.textContent = block.label.replace('\n', '');

    const text = document.createElement('span');
    text.innerHTML = `Aktiver Stein: <strong>${block.name}</strong>`;

    el.activeBrushIndicator.appendChild(dot);
    el.activeBrushIndicator.appendChild(text);
  }

  function renderWorkspaceHeader() {
    const ex = getCurrentExercise();
    if (!ex) return;

    el.studentExerciseTitle.textContent = ex.title;
    el.studentExerciseDesc.textContent = ex.description || '';

    el.inputExerciseTitle.value = ex.title;
    el.inputExerciseDesc.value = ex.description || '';

    el.btnShowSolution.textContent = state.showingSolutionPreview
      ? '🔙 Zurück zu meiner Eingabe'
      : '👁️ Musterlösung einblenden';
  }

  // Render the Railway Brake Test Diagram (Zugverband + Kuppelstelle + Prüfschritte-Raster)
  function renderDiagram() {
    el.diagramBoard.innerHTML = '';
    const ex = getCurrentExercise();
    if (!ex) return;

    const vehicles = (ex.train && ex.train.vehicles) ? ex.train.vehicles : [];
    const rows = ex.rows || [];
    const placements = getActivePlacements();
    const isTrainer = state.mode === 'trainer';

    // 1. Train Schematic Header Row (Tfz, Kuppelstelle, Wagons)
    const headerRow = document.createElement('div');
    headerRow.className = 'train-header-row';

    const headerGutter = document.createElement('div');
    headerGutter.className = 'row-control-gutter';
    const gutterLabel = document.createElement('span');
    gutterLabel.className = 'step-badge';
    gutterLabel.textContent = 'Zugverband';
    headerGutter.appendChild(gutterLabel);
    headerRow.appendChild(headerGutter);

    vehicles.forEach((veh, colIdx) => {
      const prevVeh = colIdx > 0 ? vehicles[colIdx - 1] : null;
      const isContiguousLeft = prevVeh && !prevVeh.couplingAfter;

      const wrapper = document.createElement('div');
      wrapper.className = 'train-vehicle-wrapper' + (isContiguousLeft ? ' contiguous-left' : '');

      const colHeader = document.createElement('div');
      colHeader.className = 'vehicle-column-header';

      // Top symbol (e.g. '<' over Tfz)
      const topSymbol = document.createElement('div');
      topSymbol.className = 'vehicle-top-symbol';
      if (veh.direction === 'left') {
        topSymbol.innerHTML = `<svg width="14" height="12" viewBox="0 0 14 12"><polyline points="11,1 3,6 11,11" fill="none" stroke="#000" stroke-width="1.4"/></svg>`;
      } else if (veh.direction === 'right') {
        topSymbol.innerHTML = `<svg width="14" height="12" viewBox="0 0 14 12"><polyline points="3,1 11,6 3,11" fill="none" stroke="#000" stroke-width="1.4"/></svg>`;
      }
      colHeader.appendChild(topSymbol);

      // Vehicle rectangle box
      const box = document.createElement('div');
      box.className = 'vehicle-box';
      box.textContent = veh.label !== undefined ? veh.label : (veh.type === 'tfz' ? 'Tfz' : '');
      if (isTrainer) {
        box.title = 'Klicken zum Bearbeiten (Typ, Beschriftung, Kuppelstelle)';
        box.addEventListener('click', () => openVehicleModal(colIdx));
      }
      colHeader.appendChild(box);
      wrapper.appendChild(colHeader);

      // Coupling ("Kuppelstelle") after this vehicle?
      if (veh.couplingAfter) {
        const spacer = document.createElement('div');
        spacer.className = 'coupling-spacer';

        const labelArrow = document.createElement('div');
        labelArrow.className = 'coupling-label-arrow';

        const textSpan = document.createElement('span');
        textSpan.className = 'coupling-text';
        textSpan.textContent = veh.couplingLabel || 'Kuppelstelle';

        const arrowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        arrowSvg.setAttribute('class', 'coupling-arrow-svg');
        arrowSvg.setAttribute('viewBox', '0 0 14 26');
        arrowSvg.innerHTML = `
          <line x1="7" y1="0" x2="7" y2="20" stroke="#000" stroke-width="1.4" />
          <polygon points="3.5,18 10.5,18 7,25" fill="#000" />
        `;

        labelArrow.appendChild(textSpan);
        labelArrow.appendChild(arrowSvg);

        const dottedLine = document.createElement('div');
        dottedLine.className = 'coupling-dotted-line';

        spacer.appendChild(labelArrow);
        spacer.appendChild(dottedLine);
        wrapper.appendChild(spacer);
      }

      headerRow.appendChild(wrapper);
    });

    el.diagramBoard.appendChild(headerRow);

    // 2. Step Rows under the Train
    rows.forEach((rowObj, rowIdx) => {
      const prevRow = rowIdx > 0 ? rows[rowIdx - 1] : null;

      // Im Teilnehmer-Modus soll der Zeilenabstand neutral und einheitlich sein,
      // damit nicht schon an der leeren Lücke verraten wird, wo Zeilen zusammengehören.
      // Nur wenn in beiden Zeilen Steine liegen (oder im Trainer-Modus) wird die Lücke geschlossen.
      let hasBlocksInBoth = false;
      if (rowObj.joinWithNext && rowIdx < rows.length - 1) {
        // Prüfen, ob der Teilnehmer oder die Vorschau mindestens einen Stein in beiden Zeilen hat
        const hasCurr = vehicles.some((_, c) => placements[`${rowIdx}-${c}`]);
        const hasNext = vehicles.some((_, c) => placements[`${rowIdx + 1}-${c}`]);
        hasBlocksInBoth = hasCurr && hasNext;
      }

      const isJoinedWithNext = isTrainer ? Boolean(rowObj.joinWithNext) : hasBlocksInBoth;
      const isJoinedFromPrev = isTrainer
        ? Boolean(prevRow && prevRow.joinWithNext)
        : Boolean(prevRow && prevRow.joinWithNext && vehicles.some((_, c) => placements[`${rowIdx}-${c}`]) && vehicles.some((_, c) => placements[`${rowIdx - 1}-${c}`]));

      const stepRow = document.createElement('div');
      stepRow.className = 'step-row'
        + (isJoinedWithNext ? ' joined-with-next' : '')
        + (isJoinedFromPrev ? ' joined-from-prev' : '');

      // Left gutter with step number and quick row actions
      const gutter = document.createElement('div');
      gutter.className = 'row-control-gutter';

      const stepBadge = document.createElement('span');
      stepBadge.className = 'step-badge';
      stepBadge.textContent = `${rowIdx + 1}.`;
      gutter.appendChild(stepBadge);

      // Quick button: Fill all wagons in this row with active block
      if (!state.showingSolutionPreview) {
        const fillWagonsBtn = document.createElement('button');
        fillWagonsBtn.type = 'button';
        fillWagonsBtn.className = 'row-btn';
        fillWagonsBtn.textContent = '➔W';
        fillWagonsBtn.title = 'Alle Wagen in dieser Zeile mit dem aktiven Baustein füllen (oder mit Radierer leeren)';
        fillWagonsBtn.addEventListener('click', () => fillRowWagons(rowIdx));
        gutter.appendChild(fillWagonsBtn);
      }

      if (isTrainer) {
        // Button to toggle seamless join with next row (e.g. Z directly on top of L or B)
        if (rowIdx < rows.length - 1) {
          const joinBtn = document.createElement('button');
          joinBtn.type = 'button';
          joinBtn.className = 'row-btn' + (rowObj.joinWithNext ? ' active-join' : '');
          joinBtn.textContent = '🔗';
          joinBtn.title = rowObj.joinWithNext
            ? 'Zeilenverbindung aufheben'
            : 'Mit unterer Zeile bündig verbinden (z.B. für Z über L oder Z über B)';
          joinBtn.addEventListener('click', () => {
            rowObj.joinWithNext = !rowObj.joinWithNext;
            renderDiagram();
          });
          gutter.appendChild(joinBtn);
        }

        // Delete row button
        const delRowBtn = document.createElement('button');
        delRowBtn.type = 'button';
        delRowBtn.className = 'row-btn row-btn-danger';
        delRowBtn.textContent = '×';
        delRowBtn.title = 'Diese Zeile löschen';
        delRowBtn.addEventListener('click', () => deleteRow(rowIdx));
        gutter.appendChild(delRowBtn);
      }

      stepRow.appendChild(gutter);

      // Cells container
      const cellsContainer = document.createElement('div');
      cellsContainer.className = 'step-row-cells';

      vehicles.forEach((veh, colIdx) => {
        const cellKey = `${rowIdx}-${colIdx}`;
        const placedBlockId = placements[cellKey];
        const placedBlock = placedBlockId ? getBlockById(placedBlockId) : null;

        // Check if left neighbor has a block and no coupling between them
        const prevVeh = colIdx > 0 ? vehicles[colIdx - 1] : null;
        const leftBlockId = colIdx > 0 ? placements[`${rowIdx}-${colIdx - 1}`] : null;
        const isContiguousBlockLeft = Boolean(placedBlock && leftBlockId && prevVeh && !prevVeh.couplingAfter);

        const cellWrapper = document.createElement('div');
        cellWrapper.className = 'cell-wrapper' + (isContiguousBlockLeft ? ' contiguous-block-left' : '');

        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.row = rowIdx;
        cell.dataset.col = colIdx;

        if (placedBlock) {
          cell.classList.add('has-block');
          if (placedBlock.tall) cell.classList.add('tall-block');
          if (isJoinedFromPrev && placements[`${rowIdx - 1}-${colIdx}`]) {
            cell.classList.add('has-block-above');
          }
          cell.style.setProperty('background-color', placedBlock.bgColor, 'important');
          cell.style.setProperty('color', placedBlock.textColor || '#000000', 'important');
          cell.textContent = placedBlock.label;
        }

        // Apply evaluation feedback class if active
        if (state.evaluation && state.evaluation[cellKey]) {
          cell.classList.add(`eval-${state.evaluation[cellKey]}`);
        }

        // Interactive events (Einzelklick + Ziehen mit Vorschau + Drag & Drop + Rechtsklick)
        if (!state.showingSolutionPreview) {
          cell.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // Nur linke Maustaste
            e.preventDefault();
            const map = getActivePlacements();
            const isToggleErase = Boolean(
              map[cellKey] && (state.activeTool === 'ERASER' || map[cellKey] === state.activeTool)
            );
            state.dragSpan = {
              startRow: rowIdx,
              startCol: colIdx,
              endRow: rowIdx,
              endCol: colIdx,
              action: isToggleErase ? 'erase' : 'set'
            };
            updateDragSpanVisuals();
          });

          cell.addEventListener('mouseenter', () => {
            if (state.dragSpan) {
              state.dragSpan.endRow = rowIdx;
              state.dragSpan.endCol = colIdx;
              updateDragSpanVisuals();
            }
          });

          cell.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            removeBlockFromCell(rowIdx, colIdx);
          });

          cell.addEventListener('dragover', (e) => {
            e.preventDefault();
            cell.classList.add('drag-over');
          });

          cell.addEventListener('dragleave', () => {
            cell.classList.remove('drag-over');
          });

          cell.addEventListener('drop', (e) => {
            e.preventDefault();
            cell.classList.remove('drag-over');
            state.dragSpan = null;
            clearDragSpanVisuals();
            try {
              const payload = JSON.parse(e.dataTransfer.getData('text/plain'));
              if (payload && payload.blockId) {
                const map = getActivePlacements();
                map[`${rowIdx}-${colIdx}`] = payload.blockId;
                clearEvaluationIfNeeded();
                renderDiagram();
              }
            } catch (err) {
              // ignore invalid drop
            }
          });
        }

        cellWrapper.appendChild(cell);

        if (veh.couplingAfter) {
          const gap = document.createElement('div');
          gap.className = 'cell-coupling-gap';
          cellWrapper.appendChild(gap);
        }

        cellsContainer.appendChild(cellWrapper);
      });

      stepRow.appendChild(cellsContainer);
      el.diagramBoard.appendChild(stepRow);
    });
  }

  function clearEvaluationIfNeeded() {
    if (state.evaluation) {
      state.evaluation = null;
      el.checkResultBox.classList.add('hidden');
    }
  }

  function clearDragSpanVisuals() {
    const cells = el.diagramBoard.querySelectorAll('.grid-cell.span-preview, .grid-cell.span-erase-preview');
    cells.forEach((c) => {
      c.classList.remove('span-preview', 'span-erase-preview');
      c.style.removeProperty('--span-color');
      if (c.dataset.origText !== undefined) {
        c.textContent = c.dataset.origText;
        delete c.dataset.origText;
      }
    });
  }

  function updateDragSpanVisuals() {
    clearDragSpanVisuals();
    if (!state.dragSpan) return;

    const { startRow, startCol, endRow, endCol, action } = state.dragSpan;
    const minR = Math.min(startRow, endRow);
    const maxR = Math.max(startRow, endRow);
    const minC = Math.min(startCol, endCol);
    const maxC = Math.max(startCol, endCol);

    const activeBlock = getBlockById(state.activeTool);
    const color = activeBlock ? activeBlock.bgColor : '#93c5fd';
    const previewLabel = activeBlock ? activeBlock.label : '';

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const cell = el.diagramBoard.querySelector(`.grid-cell[data-row="${r}"][data-col="${c}"]`);
        if (cell) {
          if (action === 'erase') {
            cell.classList.add('span-erase-preview');
          } else {
            cell.classList.add('span-preview');
            cell.style.setProperty('--span-color', color);
            if (!cell.classList.contains('has-block') && previewLabel) {
              cell.dataset.origText = cell.textContent;
              cell.textContent = previewLabel;
            }
          }
        }
      }
    }
  }

  function applyDragSpan() {
    if (!state.dragSpan) return;
    const { startRow, startCol, endRow, endCol, action } = state.dragSpan;
    state.dragSpan = null;
    clearDragSpanVisuals();

    const map = getActivePlacements();
    const minR = Math.min(startRow, endRow);
    const maxR = Math.max(startRow, endRow);
    const minC = Math.min(startCol, endCol);
    const maxC = Math.max(startCol, endCol);

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const key = `${r}-${c}`;
        if (action === 'erase') {
          delete map[key];
        } else if (state.activeTool && state.activeTool !== 'ERASER') {
          map[key] = state.activeTool;
        }
      }
    }

    clearEvaluationIfNeeded();
    renderDiagram();
  }

  function applyActiveToolToCell(rowIdx, colIdx) {
    if (!state.activeTool) return;
    const map = getActivePlacements();
    const key = `${rowIdx}-${colIdx}`;
    if (state.activeTool === 'ERASER') {
      delete map[key];
    } else {
      map[key] = state.activeTool;
    }
    clearEvaluationIfNeeded();
    renderDiagram();
  }

  function removeBlockFromCell(rowIdx, colIdx) {
    const map = getActivePlacements();
    const key = `${rowIdx}-${colIdx}`;
    if (map[key]) {
      delete map[key];
      clearEvaluationIfNeeded();
      renderDiagram();
    }
  }

  function fillRowWagons(rowIdx) {
    const ex = getCurrentExercise();
    if (!ex || !state.activeTool) return;
    const map = getActivePlacements();
    const wagons = ex.train.vehicles
      .map((veh, colIdx) => ({ veh, colIdx }))
      .filter((v) => v.veh.type === 'wagen');

    // Wenn bereits alle Wagen diesen Stein haben -> beim erneuten Klick leeren
    const allAlreadySet = state.activeTool !== 'ERASER' && wagons.every((w) => map[`${rowIdx}-${w.colIdx}`] === state.activeTool);

    wagons.forEach((w) => {
      const key = `${rowIdx}-${w.colIdx}`;
      if (allAlreadySet || state.activeTool === 'ERASER') {
        delete map[key];
      } else {
        map[key] = state.activeTool;
      }
    });
    clearEvaluationIfNeeded();
    renderDiagram();
  }

  function deleteRow(rowIdx) {
    const ex = getCurrentExercise();
    if (!ex) return;
    if (ex.rows.length <= 1) {
      showToast('Mindestens eine Zeile muss erhalten bleiben.');
      return;
    }
    ex.rows.splice(rowIdx, 1);
    // Shift solution keys below rowIdx up by 1
    const newSol = {};
    Object.entries(ex.solution || {}).forEach(([key, blockId]) => {
      const [r, c] = key.split('-').map(Number);
      if (r < rowIdx) {
        newSol[`${r}-${c}`] = blockId;
      } else if (r > rowIdx) {
        newSol[`${r - 1}-${c}`] = blockId;
      }
    });
    ex.solution = newSol;
    renderDiagram();
  }

  // Render Prerequisites ("Voraussetzungen:")
  function renderPrerequisites() {
    const ex = getCurrentExercise();
    if (!ex) return;
    const prereqs = ex.prerequisites || [];

    // Student View
    el.studentPrerequisitesList.innerHTML = '';
    if (prereqs.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'Keine besonderen Voraussetzungen angegeben.';
      el.studentPrerequisitesList.appendChild(li);
    } else {
      prereqs.forEach((text) => {
        const li = document.createElement('li');
        li.textContent = text;
        el.studentPrerequisitesList.appendChild(li);
      });
    }

    // Trainer Editor View
    el.trainerPrerequisitesEditor.innerHTML = '';
    prereqs.forEach((text, idx) => {
      const row = document.createElement('div');
      row.className = 'prereq-edit-row';

      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'form-input';
      input.value = text;
      input.placeholder = 'Voraussetzung eingeben...';
      input.addEventListener('input', () => {
        ex.prerequisites[idx] = input.value;
      });

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn btn-danger btn-xs';
      delBtn.textContent = '🗑️';
      delBtn.addEventListener('click', () => {
        ex.prerequisites.splice(idx, 1);
        renderPrerequisites();
      });

      row.appendChild(input);
      row.appendChild(delBtn);
      el.trainerPrerequisitesEditor.appendChild(row);
    });
  }

  // Check Solution in Student Mode
  function checkStudentSolution() {
    const ex = getCurrentExercise();
    if (!ex) return;
    state.showingSolutionPreview = false;

    const solution = ex.solution || {};
    const student = state.studentBoards[ex.id] || {};
    const evalMap = {};

    let correctCount = 0;
    let wrongCount = 0;
    let missingCount = 0;
    const totalExpected = Object.keys(solution).length;

    const allKeys = new Set([...Object.keys(solution), ...Object.keys(student)]);
    allKeys.forEach((key) => {
      const expected = solution[key];
      const actual = student[key];
      if (expected && actual === expected) {
        evalMap[key] = 'correct';
        correctCount++;
      } else if (actual && actual !== expected) {
        evalMap[key] = 'wrong';
        wrongCount++;
      } else if (expected && !actual) {
        evalMap[key] = 'missing';
        missingCount++;
      }
    });

    state.evaluation = evalMap;
    renderDiagram();

    el.checkResultBox.classList.remove('hidden', 'perfect', 'partial');
    if (wrongCount === 0 && missingCount === 0 && totalExpected > 0) {
      el.checkResultBox.classList.add('perfect');
      el.checkResultBox.innerHTML = `
        <div>
          <strong>🎉 Ausgezeichnet! Alle ${correctCount} Bausteine liegen an der exakt richtigen Stelle!</strong>
          <div>Sie haben den Ablauf dieser Bremsprobe vollständig und fehlerfrei aufgebaut.</div>
        </div>
      `;
      state.completedExercises[ex.id] = true;
      localStorage.setItem('bp_completed_exercises', JSON.stringify(state.completedExercises));
      renderExerciseList();
    } else {
      el.checkResultBox.classList.add('partial');
      el.checkResultBox.innerHTML = `
        <div>
          <strong>Noch nicht ganz komplett:</strong>
          <span>✅ <strong>${correctCount}</strong> von ${totalExpected} richtig</span> &nbsp;|&nbsp;
          <span>❌ <strong>${wrongCount}</strong> falsch platziert</span> &nbsp;|&nbsp;
          <span>❓ <strong>${missingCount}</strong> fehlen noch</span>
        </div>
        <button id="btnHideEvalMarks" class="btn btn-secondary btn-xs" type="button">Markierungen ausblenden</button>
      `;
      const hideBtn = document.getElementById('btnHideEvalMarks');
      if (hideBtn) {
        hideBtn.addEventListener('click', () => {
          state.evaluation = null;
          el.checkResultBox.classList.add('hidden');
          renderDiagram();
        });
      }
    }
  }

  // Vehicle Modal (Trainer)
  function openVehicleModal(colIdx) {
    const ex = getCurrentExercise();
    if (!ex) return;
    const veh = ex.train.vehicles[colIdx];
    if (!veh) return;

    state.editingVehicleIdx = colIdx;
    el.selectVehicleType.value = veh.type || 'wagen';
    el.inputVehicleLabel.value = veh.label !== undefined ? veh.label : '';
    el.selectVehicleDirection.value = veh.direction || 'none';
    el.checkCouplingAfter.checked = Boolean(veh.couplingAfter);
    el.inputCouplingLabel.value = veh.couplingLabel || 'Kuppelstelle';
    el.modalVehicle.classList.remove('hidden');
  }

  function applyVehicleModal() {
    const ex = getCurrentExercise();
    if (!ex || state.editingVehicleIdx === null) return;
    const veh = ex.train.vehicles[state.editingVehicleIdx];
    if (!veh) return;

    veh.type = el.selectVehicleType.value;
    veh.label = el.inputVehicleLabel.value;
    veh.direction = el.selectVehicleDirection.value;
    veh.couplingAfter = el.checkCouplingAfter.checked;
    veh.couplingLabel = el.inputCouplingLabel.value || 'Kuppelstelle';

    el.modalVehicle.classList.add('hidden');
    state.editingVehicleIdx = null;
    renderDiagram();
  }

  function deleteVehicleColumn() {
    const ex = getCurrentExercise();
    const colIdx = state.editingVehicleIdx;
    if (!ex || colIdx === null) return;
    if (ex.train.vehicles.length <= 1) {
      showToast('Der Zugverband muss mindestens ein Fahrzeug enthalten.');
      return;
    }
    ex.train.vehicles.splice(colIdx, 1);
    // Shift solution columns after colIdx left by 1
    const newSol = {};
    Object.entries(ex.solution || {}).forEach(([key, blockId]) => {
      const [r, c] = key.split('-').map(Number);
      if (c < colIdx) {
        newSol[`${r}-${c}`] = blockId;
      } else if (c > colIdx) {
        newSol[`${r}-${c - 1}`] = blockId;
      }
    });
    ex.solution = newSol;
    el.modalVehicle.classList.add('hidden');
    state.editingVehicleIdx = null;
    renderDiagram();
  }

  // Block Modal (Trainer)
  function openBlockModal(blockId = null) {
    state.editingBlockId = blockId;
    if (blockId) {
      const block = getBlockById(blockId);
      if (!block) return;
      el.modalBlockTitle.textContent = 'Baustein bearbeiten';
      el.inputBlockLabel.value = block.label.replace('\n', '\\n');
      el.inputBlockName.value = block.name;
      el.inputBlockBgColor.value = block.bgColor || '#ffffff';
      el.inputBlockTextColor.value = block.textColor || '#000000';
      el.checkBlockTall.checked = Boolean(block.tall);
      el.inputBlockDesc.value = block.description || '';
      el.btnDeleteBlock.classList.remove('hidden');
    } else {
      el.modalBlockTitle.textContent = 'Neuen Baustein erstellen';
      el.inputBlockLabel.value = 'Z';
      el.inputBlockName.value = 'Neuer Baustein';
      el.inputBlockBgColor.value = '#a2d2ff';
      el.inputBlockTextColor.value = '#000000';
      el.checkBlockTall.checked = false;
      el.inputBlockDesc.value = '';
      el.btnDeleteBlock.classList.add('hidden');
    }
    updateBlockModalPreview();
    el.modalBlock.classList.remove('hidden');
  }

  function updateBlockModalPreview() {
    const rawLabel = el.inputBlockLabel.value.replace(/\\n/g, '\n');
    el.blockModalPreview.textContent = rawLabel;
    el.blockModalPreview.style.backgroundColor = el.inputBlockBgColor.value;
    el.blockModalPreview.style.color = el.inputBlockTextColor.value;
    el.blockModalPreview.style.minHeight = el.checkBlockTall.checked ? '48px' : '28px';
  }

  async function saveBlockFromModal() {
    const label = el.inputBlockLabel.value.trim().replace(/\\n/g, '\n') || '?';
    const name = el.inputBlockName.value.trim() || label;
    const bgColor = el.inputBlockBgColor.value;
    const textColor = el.inputBlockTextColor.value;
    const tall = el.checkBlockTall.checked;
    const description = el.inputBlockDesc.value.trim();

    if (state.editingBlockId) {
      const block = getBlockById(state.editingBlockId);
      if (block) {
        block.label = label;
        block.name = name;
        block.bgColor = bgColor;
        block.textColor = textColor;
        block.tall = tall;
        block.description = description;
      }
    } else {
      const newBlock = {
        id: 'block_' + Date.now(),
        label,
        name,
        bgColor,
        textColor,
        tall,
        description
      };
      state.blocks.push(newBlock);
      state.activeTool = newBlock.id;
    }

    await persistBlocksToServer();
    el.modalBlock.classList.add('hidden');
    renderPalette();
    renderDiagram();
    renderActiveBrushIndicator();
  }

  async function deleteBlockFromModal() {
    if (!state.editingBlockId) return;
    if (state.blocks.length <= 1) {
      showToast('Mindestens ein Baustein muss vorhanden sein.');
      return;
    }
    state.blocks = state.blocks.filter((b) => b.id !== state.editingBlockId);
    if (state.activeTool === state.editingBlockId) {
      state.activeTool = state.blocks[0].id;
    }
    await persistBlocksToServer();
    el.modalBlock.classList.add('hidden');
    renderPalette();
    renderDiagram();
    renderActiveBrushIndicator();
  }

  async function persistBlocksToServer() {
    try {
      await fetch('/api/bremsprobe/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: state.blocks })
      });
      showToast('💾 Bausteine gespeichert.');
    } catch (err) {
      showToast('⚠️ Fehler beim Speichern der Bausteine.');
    }
  }

  async function saveCurrentExerciseToServer() {
    const ex = getCurrentExercise();
    if (!ex) return;
    ex.title = el.inputExerciseTitle.value.trim() || 'Unbenannte Übung';
    ex.description = el.inputExerciseDesc.value.trim();

    try {
      const res = await fetch('/api/bremsprobe/exercises', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ex)
      });
      if (res.ok) {
        showToast('✅ Übung und Musterlösung erfolgreich gespeichert!');
        renderExerciseList();
        renderWorkspaceHeader();
      }
    } catch (err) {
      showToast('⚠️ Fehler beim Speichern der Übung.');
    }
  }

  function bindEvents() {
    window.addEventListener('mouseup', () => {
      if (state.dragSpan) {
        applyDragSpan();
      }
    });

    // Exercise Dropdown change
    if (el.exerciseSelect) {
      el.exerciseSelect.addEventListener('change', (e) => {
        state.currentExerciseId = e.target.value;
        state.evaluation = null;
        state.showingSolutionPreview = false;
        el.checkResultBox.classList.add('hidden');
        renderAll();
      });
    }

    // Mode switching
    el.btnModeStudent.addEventListener('click', () => {
      state.mode = 'student';
      renderAll();
    });

    el.btnModeTrainer.addEventListener('click', () => {
      state.mode = 'trainer';
      renderAll();
    });

    // Eraser tool
    el.btnEraserTool.addEventListener('click', () => {
      state.activeTool = 'ERASER';
      renderPalette();
      renderActiveBrushIndicator();
    });

    // Student Toolbar Actions
    el.btnCheckSolution.addEventListener('click', checkStudentSolution);

    el.btnClearBoard.addEventListener('click', () => {
      const ex = getCurrentExercise();
      if (!ex) return;
      state.studentBoards[ex.id] = {};
      state.evaluation = null;
      state.showingSolutionPreview = false;
      el.checkResultBox.classList.add('hidden');
      renderWorkspaceHeader();
      renderDiagram();
    });

    el.btnShowSolution.addEventListener('click', () => {
      state.showingSolutionPreview = !state.showingSolutionPreview;
      state.evaluation = null;
      el.checkResultBox.classList.add('hidden');
      renderWorkspaceHeader();
      renderDiagram();
    });

    // Trainer Exercise Metadata inputs
    el.inputExerciseTitle.addEventListener('input', () => {
      const ex = getCurrentExercise();
      if (ex) {
        ex.title = el.inputExerciseTitle.value;
        renderExerciseList();
      }
    });

    el.inputExerciseDesc.addEventListener('input', () => {
      const ex = getCurrentExercise();
      if (ex) ex.description = el.inputExerciseDesc.value;
    });

    el.btnSaveExercise.addEventListener('click', saveCurrentExerciseToServer);

    el.btnNewExercise.addEventListener('click', async () => {
      const newEx = {
        id: 'ex_' + Date.now(),
        title: `Neue Bremsprobe-Übung (${state.exercises.length + 1})`,
        description: 'Legen Sie die passenden Bausteine an die richtige Stelle unter dem Zugverband.',
        prerequisites: [
          'Bei Güterzügen darf eine volle Bremsprobe ohne separaten Zustandsgang durchgeführt werden.'
        ],
        train: {
          vehicles: [
            { id: 'v0', type: 'tfz', label: 'Tfz', direction: 'left', couplingAfter: true, couplingLabel: 'Kuppelstelle' },
            ...Array.from({ length: 11 }, (_, i) => ({
              id: `vw_${i + 1}`,
              type: 'wagen',
              label: '',
              direction: 'none',
              couplingAfter: false
            }))
          ]
        },
        rows: Array.from({ length: 7 }, (_, i) => ({ id: `r_${i}`, joinWithNext: false })),
        solution: {}
      };
      state.exercises.push(newEx);
      state.currentExerciseId = newEx.id;
      await saveCurrentExerciseToServer();
      renderAll();
    });

    el.btnDuplicateExercise.addEventListener('click', async () => {
      const ex = getCurrentExercise();
      if (!ex) return;
      const copy = JSON.parse(JSON.stringify(ex));
      copy.id = 'ex_' + Date.now();
      copy.title = ex.title + ' (Kopie)';
      state.exercises.push(copy);
      state.currentExerciseId = copy.id;
      await saveCurrentExerciseToServer();
      renderAll();
    });

    el.btnDeleteExercise.addEventListener('click', async () => {
      const ex = getCurrentExercise();
      if (!ex) return;
      if (state.exercises.length <= 1) {
        showToast('Die letzte Übung kann nicht gelöscht werden.');
        return;
      }
      if (!confirm(`Möchten Sie die Übung "${ex.title}" wirklich löschen?`)) return;
      await fetch(`/api/bremsprobe/exercises/${ex.id}`, { method: 'DELETE' });
      state.exercises = state.exercises.filter((e) => e.id !== ex.id);
      state.currentExerciseId = state.exercises[0].id;
      showToast('🗑️ Übung gelöscht.');
      renderAll();
    });

    // Trainer Train & Row Controls
    el.btnAddWagon.addEventListener('click', () => {
      const ex = getCurrentExercise();
      if (!ex) return;
      ex.train.vehicles.push({
        id: 'v_' + Date.now(),
        type: 'wagen',
        label: '',
        direction: 'none',
        couplingAfter: false
      });
      renderDiagram();
    });

    el.btnRemoveWagon.addEventListener('click', () => {
      const ex = getCurrentExercise();
      if (!ex || ex.train.vehicles.length <= 2) return;
      const removedIdx = ex.train.vehicles.length - 1;
      ex.train.vehicles.pop();
      Object.keys(ex.solution || {}).forEach((k) => {
        const [, c] = k.split('-').map(Number);
        if (c === removedIdx) delete ex.solution[k];
      });
      renderDiagram();
    });

    el.btnAddTfz.addEventListener('click', () => {
      const ex = getCurrentExercise();
      if (!ex) return;
      ex.train.vehicles.push({
        id: 'v_tfz_' + Date.now(),
        type: 'tfz',
        label: 'Tfz',
        direction: 'right',
        couplingAfter: false
      });
      renderDiagram();
    });

    el.btnAddRow.addEventListener('click', () => {
      const ex = getCurrentExercise();
      if (!ex) return;
      ex.rows.push({ id: 'r_' + Date.now(), joinWithNext: false });
      renderDiagram();
    });

    el.btnClearTrainerGrid.addEventListener('click', () => {
      const ex = getCurrentExercise();
      if (!ex) return;
      ex.solution = {};
      renderDiagram();
    });

    el.btnAddPrerequisite.addEventListener('click', () => {
      const ex = getCurrentExercise();
      if (!ex) return;
      if (!ex.prerequisites) ex.prerequisites = [];
      ex.prerequisites.push('Neue Voraussetzung...');
      renderPrerequisites();
    });

    // Vehicle Modal Events
    el.btnCloseVehicleModal.addEventListener('click', () => el.modalVehicle.classList.add('hidden'));
    el.btnCancelVehicleModal.addEventListener('click', () => el.modalVehicle.classList.add('hidden'));
    el.btnApplyVehicleModal.addEventListener('click', applyVehicleModal);
    el.btnDeleteVehicle.addEventListener('click', deleteVehicleColumn);
    el.selectVehicleType.addEventListener('change', () => {
      if (el.selectVehicleType.value === 'tfz' && !el.inputVehicleLabel.value) {
        el.inputVehicleLabel.value = 'Tfz';
      } else if (el.selectVehicleType.value === 'wagen' && el.inputVehicleLabel.value === 'Tfz') {
        el.inputVehicleLabel.value = '';
      }
    });

    // Block Modal Events
    el.btnNewBlock.addEventListener('click', () => openBlockModal(null));
    el.btnCloseBlockModal.addEventListener('click', () => el.modalBlock.classList.add('hidden'));
    el.btnCancelBlockModal.addEventListener('click', () => el.modalBlock.classList.add('hidden'));
    el.btnSaveBlockModal.addEventListener('click', saveBlockFromModal);
    el.btnDeleteBlock.addEventListener('click', deleteBlockFromModal);
    [el.inputBlockLabel, el.inputBlockBgColor, el.inputBlockTextColor, el.checkBlockTall].forEach((inp) => {
      inp.addEventListener('input', updateBlockModalPreview);
      inp.addEventListener('change', updateBlockModalPreview);
    });

    // Export / Import JSON
    el.btnExportJson.addEventListener('click', () => {
      const payload = {
        blocks: state.blocks,
        exercises: state.exercises,
        exportedAt: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bremsprobe-uebungen.json';
      a.click();
      URL.revokeObjectURL(url);
    });

    el.inputImportJson.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const parsed = JSON.parse(ev.target.result);
          const res = await fetch('/api/bremsprobe/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed)
          });
          if (res.ok) {
            const { store } = await res.json();
            state.blocks = store.blocks || [];
            state.exercises = store.exercises || [];
            if (state.exercises.length > 0) state.currentExerciseId = state.exercises[0].id;
            showToast('✅ Übungen & Bausteine erfolgreich importiert!');
            renderAll();
          }
        } catch (err) {
          showToast('⚠️ Ungültige JSON-Datei.');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
  }

  initApp();
})();
