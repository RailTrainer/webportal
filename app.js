
// SUPABASE CLIENT
const SUPABASE_URL = 'https://ahmcoyfmdrgpmclaxgfj.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_cENpbfjZbysfKIjFKxTFWg_YziNteq1';
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

let allQuestions = [];
let allFlashcards = [];
let allCategories = [];
let allUsers = [];
let allAttempts = [];

// INITIALISIERUNG
async function initDashboard() {
  console.log('RailTrainer Dashboard Initialisierung...');
  if (window.lucide) lucide.createIcons();
  await loadAllData();

  const themeBtn = document.getElementById('themeToggleBtn');
  if (themeBtn) {
    themeBtn.onclick = () => {
      document.documentElement.classList.toggle('dark');
    };
  }

  const dropZone = document.getElementById('dropZone');
  if (dropZone) {
    dropZone.onclick = () => {
      const fi = document.getElementById('csvFileInput');
      if (fi) fi.click();
    };
    dropZone.ondragover = (e) => { e.preventDefault(); dropZone.classList.add('border-brand-500'); };
    dropZone.ondragleave = () => dropZone.classList.remove('border-brand-500');
    dropZone.ondrop = (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-brand-500');
      if (e.dataTransfer.files.length) parseCsvFile(e.dataTransfer.files[0]);
    };
  }
}

// Global Exports
window.loadAllData = async function() {
  if (!supabase) {
    console.error('Supabase client nicht bereit.');
    return;
  }
  try {
    // 1. Kategorien
    const { data: catData, error: catErr } = await supabase.from('categories').select('*').order('name');
    allCategories = catData || [];
    renderCategorySelects();
    renderCategories();

    // 2. Fragen
    const { data: qData, error: qErr } = await supabase.from('quiz_questions').select('*').order('created_at', { ascending: false });
    allQuestions = qData || [];
    const bq = document.getElementById('badge-questions-count');
    if (bq) bq.textContent = allQuestions.length;
    renderQuestions(allQuestions);

    // 3. Lernkarten
    const { data: fcData, error: fcErr } = await supabase.from('flashcards').select('*').order('created_at', { ascending: false });
    allFlashcards = fcData || [];
    const bfc = document.getElementById('badge-flashcards-count');
    if (bfc) bfc.textContent = allFlashcards.length;
    renderFlashcards(allFlashcards);

    // 4. Benutzer
    const { data: uData, error: uErr } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    allUsers = uData || [];
    const bu = document.getElementById('badge-users-count');
    if (bu) bu.textContent = allUsers.length;
    renderUsers();

    // 5. Statistiken
    const { data: attData, error: attErr } = await supabase.from('quiz_attempts').select('*').order('timestamp', { ascending: false }).limit(100);
    allAttempts = attData || [];
    renderStats();

    if (window.lucide) lucide.createIcons();
    console.log('Daten erfolgreich geladen:', {
      categories: allCategories.length,
      questions: allQuestions.length,
      flashcards: allFlashcards.length,
      users: allUsers.length
    });
  } catch (err) {
    console.error('Ladefehler:', err);
  }
};

window.switchTab = function(tabId) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.nav-tab').forEach(el => {
    el.classList.remove('bg-brand-600', 'text-white', 'shadow', 'shadow-brand-600/20');
    el.classList.add('text-gray-400');
  });

  const target = document.getElementById('tab-' + tabId);
  if (target) target.classList.remove('hidden');
  const activeBtn = document.getElementById('tab-btn-' + tabId);
  if (activeBtn) {
    activeBtn.classList.add('bg-brand-600', 'text-white', 'shadow', 'shadow-brand-600/20');
    activeBtn.classList.remove('text-gray-400');
  }
  if (window.lucide) lucide.createIcons();
};

window.renderQuestions = function(list) {
  const container = document.getElementById('questionsContainer');
  if (!container) return;
  if (list.length === 0) {
    container.innerHTML = '<div class="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center text-gray-500"><p class="font-bold text-gray-300">Keine Prüfungsfragen gefunden</p></div>';
    return;
  }
  container.innerHTML = list.map(q => {
    const options = Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? JSON.parse(q.options) : []);
    const corrIndices = Array.isArray(q.correct_indices) ? q.correct_indices :
      (Array.isArray(q.correctIndices) ? q.correctIndices :
      (typeof q.correct_indices === 'string' ? JSON.parse(q.correct_indices) :
      [typeof q.correct_index === 'number' ? q.correct_index : 0]));
    return '<div class="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-5 shadow-lg transition">' +
      '<div class="flex items-start justify-between gap-4 mb-3">' +
        '<div class="flex items-center gap-2 flex-wrap">' +
          '<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-500/20 text-brand-400 border border-brand-500/30">#' + (q.category || 'Allgemein') + '</span>' +
          (corrIndices.length > 1 ? '<span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1"><i data-lucide="check-square" class="w-3 h-3 text-purple-400"></i><span>Mehrfachauswahl (' + corrIndices.length + ')</span></span>' : '') +
          '<span class="text-xs text-gray-500">ID: ' + q.id + '</span>' +
        '</div>' +
        '<div class="flex items-center gap-2">' +
          '<button onclick="window.editQuestion(\'' + q.id + '\')" class="p-1.5 text-gray-400 hover:text-brand-400 hover:bg-gray-800 rounded-lg transition" title="Bearbeiten"><i data-lucide="edit-3" class="w-4 h-4"></i></button>' +
          '<button onclick="window.deleteQuestion(\'' + q.id + '\')" class="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition" title="Löschen"><i data-lucide="trash-2" class="w-4 h-4"></i></button>' +
        '</div>' +
      '</div>' +
      '<p class="font-bold text-base text-gray-100 mb-3">' + q.text + '</p>' +
      '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">' +
        options.map((opt, oIdx) => {
          const isCorrect = corrIndices.includes(oIdx);
          return '<div class="px-3.5 py-2 rounded-xl text-xs flex items-center justify-between gap-2.5 border ' +
            (isCorrect ? 'bg-brand-500/10 border-brand-500/40 text-brand-300 font-semibold' : 'bg-gray-950 border-gray-800 text-gray-400') + '">' +
            '<div class="flex items-center gap-2.5 min-w-0">' +
              '<span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ' +
                (isCorrect ? 'bg-brand-500 text-white' : 'bg-gray-800 text-gray-400') + '">' + (['A','B','C','D'][oIdx] || oIdx + 1) + '</span>' +
              '<span>' + opt + '</span>' +
            '</div>' +
            (isCorrect && corrIndices.length > 1 ? '<span class="text-[10px] font-bold text-brand-400 bg-brand-500/20 px-1.5 py-0.5 rounded shrink-0">Richtig ✓</span>' : '') +
          '</div>';
        }).join('') +
      '</div>' +
      (q.explanation ? '<div class="bg-gray-950/70 rounded-xl p-3 border border-gray-800/80 text-xs text-gray-400"><span class="font-bold text-gray-300">Erklärung:</span> ' + q.explanation + '</div>' : '') +
    '</div>';
  }).join('');
  if (window.lucide) lucide.createIcons();
};

window.filterQuestions = function() {
  const search = (document.getElementById('searchQuestionsInput')?.value || '').toLowerCase();
  const cat = document.getElementById('filterQuestionCategory')?.value || 'ALL';
  const filtered = allQuestions.filter(q => {
    const matchesCat = cat === 'ALL' || q.category === cat;
    const matchesSearch = (q.text || '').toLowerCase().includes(search) || ((q.explanation || '').toLowerCase().includes(search));
    return matchesCat && matchesSearch;
  });
  renderQuestions(filtered);
};

window.handleSaveQuestion = async function(e) {
  if (e) e.preventDefault();
  const id = document.getElementById('q_id').value || ('q_' + Math.random().toString(36).substr(2, 9));
  const category = document.getElementById('q_category').value;
  const text = document.getElementById('q_text').value.trim();
  const explanation = document.getElementById('q_explanation').value.trim();
  const imageUrl = document.getElementById('q_image')?.value?.trim() || null;
  const is_verified = document.getElementById('q_verified')?.checked ?? true;
  const options = [
    document.getElementById('q_opt_0').value.trim(),
    document.getElementById('q_opt_1').value.trim(),
    document.getElementById('q_opt_2').value.trim(),
    document.getElementById('q_opt_3').value.trim()
  ];
  const checkedBoxes = Array.from(document.querySelectorAll('input[name="q_correct"]:checked'));
  const correctIndices = checkedBoxes.map(cb => parseInt(cb.value));

  if (!category || !text || !options[0] || !options[1] || !options[2] || !options[3]) {
    alert('Bitte Kategorie, Fragentext und alle 4 Antwortoptionen ausfüllen.');
    return;
  }
  if (correctIndices.length === 0) {
    alert('Bitte mindestens eine Antwort als richtig markieren.');
    return;
  }
  const correctIndex = correctIndices[0];

  const { error } = await supabase.from('quiz_questions').upsert({
    id, category, text, options,
    correct_index: correctIndex,
    correct_indices: correctIndices,
    explanation,
    image_url: imageUrl,
    is_verified
  });
  if (error) {
    // Retry without correct_indices if column does not exist
    if (error.message && error.message.includes('correct_indices')) {
      const { error: fallbackErr } = await supabase.from('quiz_questions').upsert({
        id, category, text, options,
        correct_index: correctIndex,
        explanation,
        image_url: imageUrl,
        is_verified
      });
      if (fallbackErr) return alert('Fehler: ' + fallbackErr.message);
    } else {
      return alert('Fehler: ' + error.message);
    }
  }
  closeQuestionModal();
  showToast('Frage in Cloud gespeichert! ✅');
  await loadAllData();
};

window.handleCorrectCheckboxChange = function(idx, cb) {
  const checked = Array.from(document.querySelectorAll('input[name="q_correct"]:checked'));
  if (checked.length === 0) {
    if (cb) cb.checked = true;
    if (window.showToast) window.showToast('Mindestens eine Antwort muss richtig sein! ⚠️');
  }
  window.updateCorrectOptionsUI();
};

window.toggleCorrectOption = function(idx, event) {
  if (event && event.target) {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'BUTTON' || event.target.closest('button')) {
      return;
    }
  }
  const cb = document.getElementById('opt_radio_' + idx);
  if (cb) {
    cb.checked = !cb.checked;
    const checked = Array.from(document.querySelectorAll('input[name="q_correct"]:checked'));
    if (checked.length === 0) {
      cb.checked = true;
      if (window.showToast) window.showToast('Mindestens eine Antwort muss richtig sein! ⚠️');
    }
    window.updateCorrectOptionsUI();
  }
};

window.setCorrectOptions = function(indices) {
  const arr = (Array.isArray(indices) && indices.length > 0) ? indices.map(n => parseInt(n)) : [0];
  for (let i = 0; i <= 3; i++) {
    const cb = document.getElementById('opt_radio_' + i);
    if (cb) {
      cb.checked = arr.includes(i);
    }
  }
  window.updateCorrectOptionsUI();
};

window.updateCorrectOptionsUI = function() {
  const optLetters = ['A', 'B', 'C', 'D'];
  const checkedIndices = [];
  for (let i = 0; i <= 3; i++) {
    const cb = document.getElementById('opt_radio_' + i);
    const row = document.getElementById('opt_row_' + i);
    const badge = document.getElementById('opt_badge_' + i) || (row ? row.querySelector('span') : null);
    const isChecked = cb ? cb.checked : false;
    if (isChecked) checkedIndices.push(i);

    if (row) {
      if (isChecked) {
        row.className = 'flex items-center gap-2.5 bg-gray-950 p-2.5 rounded-xl border border-brand-500/60 bg-brand-500/10 shadow-sm transition cursor-pointer select-none';
      } else {
        row.className = 'flex items-center gap-2.5 bg-gray-950 p-2.5 rounded-xl border border-gray-800 hover:border-gray-700 transition cursor-pointer select-none';
      }
    }
    if (badge) {
      if (isChecked) {
        badge.className = 'w-5 h-5 rounded-md bg-brand-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0';
      } else {
        badge.className = 'w-5 h-5 rounded-md bg-gray-800 text-gray-400 flex items-center justify-center font-bold text-[11px] shrink-0';
      }
    }
  }

  const ind = document.getElementById('correctAnswerIndicatorText');
  if (ind) {
    if (checkedIndices.length === 1) {
      ind.textContent = 'Korrekt: Antwort ' + optLetters[checkedIndices[0]];
    } else if (checkedIndices.length > 1) {
      ind.textContent = 'Korrekt: Antworten ' + checkedIndices.map(i => optLetters[i]).join(', ') + ' (' + checkedIndices.length + ' richtig)';
    } else {
      ind.textContent = 'Bitte mindestens eine Antwort als richtig markieren';
    }
  }
};

window.openQuestionModal = function() {
  const form = document.getElementById('questionForm');
  if (form) form.reset();
  document.getElementById('q_id').value = '';
  if (window.setCorrectOptions) {
    window.setCorrectOptions([0]);
  } else {
    for (let i = 0; i <= 3; i++) {
      const cb = document.getElementById('opt_radio_' + i);
      if (cb) cb.checked = (i === 0);
    }
  }
  document.getElementById('questionModalTitle').innerHTML = '<i data-lucide="plus-circle" class="w-5 h-5 text-brand-500"></i> Neue Prüfungsfrage anlegen';
  const modal = document.getElementById('questionModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
  if (window.lucide) lucide.createIcons();
};

window.editQuestion = function(id) {
  const q = allQuestions.find(item => item.id === id);
  if (!q) return;
  document.getElementById('q_id').value = q.id;
  document.getElementById('q_category').value = q.category;
  document.getElementById('q_text').value = q.text;
  document.getElementById('q_explanation').value = q.explanation || '';
  document.getElementById('q_image').value = q.image_url || '';
  const opts = Array.isArray(q.options) ? q.options : (typeof q.options === 'string' ? JSON.parse(q.options) : []);
  document.getElementById('q_opt_0').value = opts[0] || '';
  document.getElementById('q_opt_1').value = opts[1] || '';
  document.getElementById('q_opt_2').value = opts[2] || '';
  document.getElementById('q_opt_3').value = opts[3] || '';
  const corrIndices = Array.isArray(q.correct_indices) ? q.correct_indices :
    (Array.isArray(q.correctIndices) ? q.correctIndices :
    (typeof q.correct_indices === 'string' ? JSON.parse(q.correct_indices) :
    [typeof q.correct_index === 'number' ? q.correct_index : 0]));
  if (window.setCorrectOptions) {
    window.setCorrectOptions(corrIndices);
  } else {
    for (let i = 0; i <= 3; i++) {
      const cb = document.getElementById('opt_radio_' + i);
      if (cb) cb.checked = corrIndices.includes(i);
    }
  }
  document.getElementById('questionModalTitle').innerHTML = '<i data-lucide="edit-3" class="w-5 h-5 text-brand-500"></i> Frage bearbeiten';
  const modal = document.getElementById('questionModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
  if (window.lucide) lucide.createIcons();
};

window.closeQuestionModal = function() {
  const modal = document.getElementById('questionModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};

window.deleteQuestion = async function(id) {
  if (!confirm('Prüfungsfrage wirklich löschen?')) return;
  await supabase.from('quiz_questions').delete().eq('id', id);
  showToast('Frage gelöscht! 🗑️');
  await loadAllData();
};

window.renderFlashcards = function(list) {
  const container = document.getElementById('flashcardsContainer');
  if (!container) return;
  if (list.length === 0) {
    container.innerHTML = '<div class="col-span-full bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center text-gray-500"><p class="font-bold text-gray-300">Keine Lernkarten vorhanden</p></div>';
    return;
  }
  container.innerHTML = list.map(fc => {
    return '<div class="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition">' +
      '<div>' +
        '<div class="flex items-center justify-between gap-2 mb-3">' +
          '<span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-500/20 text-brand-400 border border-brand-500/30">#' + fc.category + '</span>' +
          '<div class="flex items-center gap-1">' +
            '<button onclick="window.editFlashcard(\'' + fc.id + '\')" class="p-1.5 text-gray-400 hover:text-brand-400 hover:bg-gray-800 rounded-lg transition" title="Bearbeiten"><i data-lucide="edit-3" class="w-4 h-4"></i></button>' +
            '<button onclick="window.deleteFlashcard(\'' + fc.id + '\')" class="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition" title="Löschen"><i data-lucide="trash-2" class="w-4 h-4"></i></button>' +
          '</div>' +
        '</div>' +
        '<h4 class="font-bold text-base text-white mb-2">' + fc.title + '</h4>' +
        '<p class="text-xs text-gray-300 leading-relaxed mb-4 whitespace-pre-line">' + fc.content + '</p>' +
      '</div>' +
      (fc.reference ? '<div class="pt-3 border-t border-gray-800 text-[11px] text-gray-400 flex items-center gap-1.5"><i data-lucide="book" class="w-3.5 h-3.5 text-brand-500"></i><span>' + fc.reference + '</span></div>' : '') +
    '</div>';
  }).join('');
  if (window.lucide) lucide.createIcons();
};

window.filterFlashcards = function() {
  const search = (document.getElementById('searchFlashcardsInput')?.value || '').toLowerCase();
  const cat = document.getElementById('filterFlashcardCategory')?.value || 'ALL';
  const filtered = allFlashcards.filter(fc => {
    const matchesCat = cat === 'ALL' || fc.category === cat;
    const matchesSearch = (fc.title || '').toLowerCase().includes(search) || ((fc.content || '').toLowerCase().includes(search));
    return matchesCat && matchesSearch;
  });
  renderFlashcards(filtered);
};

window.openFlashcardModal = function() {
  const form = document.getElementById('flashcardForm');
  if (form) form.reset();
  document.getElementById('fc_id').value = '';
  document.getElementById('flashcardModalTitle').innerHTML = '<i data-lucide="plus-circle" class="w-5 h-5 text-brand-500"></i> Neue Lernkarte anlegen';
  const modal = document.getElementById('flashcardModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
  if (window.lucide) lucide.createIcons();
};

window.editFlashcard = function(id) {
  const fc = allFlashcards.find(item => item.id === id);
  if (!fc) return;
  document.getElementById('fc_id').value = fc.id;
  document.getElementById('fc_category').value = fc.category;
  document.getElementById('fc_title').value = fc.title;
  document.getElementById('fc_content').value = fc.content;
  document.getElementById('fc_reference').value = fc.reference || '';
  document.getElementById('flashcardModalTitle').innerHTML = '<i data-lucide="edit-3" class="w-5 h-5 text-brand-500"></i> Lernkarte bearbeiten';
  const modal = document.getElementById('flashcardModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
  if (window.lucide) lucide.createIcons();
};

window.closeFlashcardModal = function() {
  const modal = document.getElementById('flashcardModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};

window.handleSaveFlashcard = async function(e) {
  if (e) e.preventDefault();
  const id = document.getElementById('fc_id').value || ('fact_' + Math.random().toString(36).substr(2, 9));
  const category = document.getElementById('fc_category').value;
  const title = document.getElementById('fc_title').value.trim();
  const content = document.getElementById('fc_content').value.trim();
  const reference = document.getElementById('fc_reference').value.trim();
  const imageUrl = document.getElementById('fc_image')?.value.trim() || null;
  const existingFc = allFlashcards.find(item => item.id === id);
  const is_verified = existingFc ? Boolean(existingFc.is_verified) : false;
  const { error } = await supabase.from('flashcards').upsert({ id, category, title, content, reference, image_url: imageUrl, is_verified });
  if (error) return alert('Fehler: ' + error.message);
  closeFlashcardModal();
  showToast('Lernkarte gespeichert! 🃏');
  await loadAllData();
};

window.deleteFlashcard = async function(id) {
  if (!confirm('Lernkarte wirklich löschen?')) return;
  await supabase.from('flashcards').delete().eq('id', id);
  showToast('Lernkarte gelöscht! 🗑️');
  await loadAllData();
};

window.renderCategories = function() {
  const container = document.getElementById('categoriesContainer');
  if (!container) return;
  container.innerHTML = allCategories.map(c => {
    return '<div class="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-lg flex items-start justify-between">' +
      '<div class="flex items-center gap-3">' +
        '<div class="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow" style="background-color: ' + (c.color || '#22c55e') + '">' +
          '<i data-lucide="book-open" class="w-5 h-5"></i>' +
        '</div>' +
        '<div>' +
          '<h4 class="font-bold text-white">' + c.name + '</h4>' +
          '<p class="text-xs text-gray-400">' + (c.description || 'Keine Beschreibung') + '</p>' +
        '</div>' +
      '</div>' +
      '<button onclick="window.deleteCategory(\'' + c.name + '\')" class="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition"><i data-lucide="trash-2" class="w-4 h-4"></i></button>' +
    '</div>';
  }).join('');
  if (window.lucide) lucide.createIcons();
};

window.renderCategorySelects = function() {
  const opts = allCategories.map(c => '<option value="' + c.name + '">' + c.name + '</option>').join('');
  const qCat = document.getElementById('q_category');
  if (qCat) qCat.innerHTML = opts;
  const fcCat = document.getElementById('fc_category');
  if (fcCat) fcCat.innerHTML = opts;
  const filterOpts = '<option value="ALL">Alle Kategorien (Gesamt)</option>' + opts;
  const fqCat = document.getElementById('filterQuestionCategory');
  if (fqCat) fqCat.innerHTML = filterOpts;
  const ffcCat = document.getElementById('filterFlashcardCategory');
  if (ffcCat) ffcCat.innerHTML = filterOpts;
};

window.openCategoryModal = function() {
  const form = document.getElementById('categoryForm');
  if (form) form.reset();
  const modal = document.getElementById('categoryModal');
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
};

window.closeCategoryModal = function() {
  const modal = document.getElementById('categoryModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};

window.handleSaveCategory = async function(e) {
  if (e) e.preventDefault();
  const name = document.getElementById('cat_name').value.trim();
  const description = document.getElementById('cat_desc').value.trim();
  const color = document.getElementById('cat_color').value;
  const { error } = await supabase.from('categories').upsert({ name, description, color, icon: 'BookOpen' });
  if (error) return alert('Fehler: ' + error.message);
  closeCategoryModal();
  showToast('Kategorie angelegt! 📂');
  await loadAllData();
};

window.deleteCategory = async function(name) {
  if (!confirm('Kategorie "' + name + '" löschen?')) return;
  await supabase.from('categories').delete().eq('name', name);
  showToast('Kategorie gelöscht! 🗑️');
  await loadAllData();
};

let parsedCsvRows = [];
window.handleFileSelect = function(e) {
  const file = e.target.files[0];
  if (file) parseCsvFile(file);
};

window.parseCsvFile = function(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    const lines = text.split(/\r\n|\n/).filter(l => l.trim().length > 0);
    if (lines.length <= 1) return alert('CSV leer');
    const delimiter = lines[0].includes(';') ? ';' : ',';
    parsedCsvRows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length >= 6) {
        const rawCorrect = (cols[6] || '0').trim();
        const parsedIndices = [];
        const parts = rawCorrect.split(/[,;+/| ]+/);
        for (const p of parts) {
          const up = p.trim().toUpperCase();
          if (['A', 'B', 'C', 'D'].includes(up)) {
            parsedIndices.push(up.charCodeAt(0) - 65);
          } else {
            const num = parseInt(up, 10);
            if (!isNaN(num) && num >= 0 && num <= 3) {
              parsedIndices.push(num);
            }
          }
        }
        const validIndices = parsedIndices.length > 0 ? Array.from(new Set(parsedIndices)) : [0];
        parsedCsvRows.push({
          category: cols[0] || 'Allgemein',
          text: cols[1],
          options: [cols[2], cols[3], cols[4], cols[5]],
          correct_index: validIndices[0],
          correct_indices: validIndices,
          explanation: cols[7] || ''
        });
      }
    }
    document.getElementById('csvPreviewCount').textContent = parsedCsvRows.length + ' Fragen erkannt';
    document.getElementById('csvPreviewTable').innerHTML = '<thead><tr class="text-gray-400 border-b border-gray-800"><th class="py-1 px-2">Kategorie</th><th class="py-1 px-2">Frage</th><th class="py-1 px-2">Antwort(en)</th></tr></thead><tbody>' +
      parsedCsvRows.slice(0, 10).map(r => {
        const optLabels = (r.correct_indices && r.correct_indices.length > 0)
          ? r.correct_indices.map(i => (['A','B','C','D'][i] || i) + ': ' + (r.options[i] || '')).join(', ')
          : (r.options[r.correct_index] || '');
        const multiBadge = (r.correct_indices && r.correct_indices.length > 1) ? ' <span class="text-xs text-purple-400 font-bold">(' + r.correct_indices.length + ' Richtige)</span>' : '';
        return '<tr class="border-b border-gray-800/50"><td class="py-1 px-2 text-brand-400 font-bold">' + r.category + '</td><td class="py-1 px-2 text-gray-200">' + r.text + '</td><td class="py-1 px-2 text-brand-300 font-semibold">' + optLabels + multiBadge + '</td></tr>';
      }).join('') +
      '</tbody>';
    document.getElementById('csvPreviewArea').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
  };
  reader.readAsText(file, 'UTF-8');
};

window.commitCsvImport = async function() {
  if (parsedCsvRows.length === 0) return;
  const toInsert = parsedCsvRows.map(r => ({
    id: 'q_' + Math.random().toString(36).substr(2, 9),
    category: r.category,
    text: r.text,
    options: r.options,
    correct_index: r.correct_index,
    correct_indices: r.correct_indices || [r.correct_index],
    explanation: r.explanation
  }));
  let { error } = await supabase.from('quiz_questions').insert(toInsert);
  if (error && error.message && error.message.includes('correct_indices')) {
    const fallback = toInsert.map(item => {
      const copy = { ...item };
      delete copy.correct_indices;
      return copy;
    });
    const res = await supabase.from('quiz_questions').insert(fallback);
    error = res.error;
  }
  if (error) return alert('Fehler: ' + error.message);
  document.getElementById('csvPreviewArea').classList.add('hidden');
  showToast(toInsert.length + ' Fragen importiert! 🎉');
  await loadAllData();
  switchTab('questions');
};

window.downloadQuestionsTemplate = function() {
  const csv = 'Kategorie;Fragentext;Antwort_A;Antwort_B;Antwort_C;Antwort_D;Index_Richtige_Antwort_0_bis_3_oder_Mehrfachauswahl_zB_0,1;Erklaerung\n' +
    'Signale;Welche Bedeutung hat das Signal Zs 1?;Fahrt mit 40 km/h;Halt;Vorbeifahrt am Halt-Signal erlaubt;Langsamfahrt;2;Signal Zs 1 erlaubt die Vorbeifahrt am gestörten Signal.\n' +
    'Signale;Welche dieser Signale sind Hauptsignale?;Signal Hp 0;Signal Hp 1;Signal Zs 1;Signal Vr 0;0,1;Hp 0 und Hp 1 sind Hauptsignale.\n' +
    'PZB 90;Wie lange dauert die 1000Hz Beeinflussung?;23 Sekunden;15 Sekunden;38 Sekunden;30 Sekunden;0;In der oberen Zugart 23 Sekunden.';
  downloadFile(csv, 'RailTrainer_Fragen_Vorlage.csv', 'text/csv;charset=utf-8;');
};

window.downloadFlashcardsTemplate = function() {
  const csv = 'Kategorie;Titel;Inhalt;Referenz\nSignale;Signal Hp 0;Halt für Zug- und Rangierfahrten;Ril 301.0101\nBremsprobe;Volle Bremsprobe;Erforderlich bei neu gebildeten Zügen;Ril 915.0101';
  downloadFile(csv, 'RailTrainer_Lernkarten_Vorlage.csv', 'text/csv;charset=utf-8;');
};

window.exportDatabaseJson = function() {
  const backup = { exportedAt: new Date().toISOString(), categories: allCategories, questions: allQuestions, flashcards: allFlashcards };
  downloadFile(JSON.stringify(backup, null, 2), 'RailTrainer_Backup_' + new Date().toISOString().slice(0,10) + '.json', 'application/json');
};

window.downloadFile = function(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
};

window.renderUsers = function() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;
  tbody.innerHTML = allUsers.map(u => {
    return '<tr class="hover:bg-gray-800/50 transition">' +
      '<td class="px-5 py-3 font-semibold text-white flex items-center gap-2">' +
        '<div class="w-7 h-7 rounded-full bg-brand-600/30 text-brand-400 flex items-center justify-center font-bold text-xs">' + (u.name || 'U').slice(0, 2).toUpperCase() + '</div>' +
        (u.name || '') +
      '</td>' +
      '<td class="px-5 py-3 text-gray-300">' + (u.email || '') + '</td>' +
      '<td class="px-5 py-3">' +
        '<select onchange="window.updateUserRole(\'' + u.id + '\', this.value)" class="px-2.5 py-1 bg-gray-950 border border-gray-700 rounded-lg text-xs font-semibold ' +
          (u.role === 'admin' ? 'text-red-400' : u.role === 'moderator' ? 'text-amber-400' : 'text-blue-400') + '">' +
          '<option value="user" ' + (u.role === 'user' ? 'selected' : '') + '>Schüler</option>' +
          '<option value="moderator" ' + (u.role === 'moderator' ? 'selected' : '') + '>Prüfer</option>' +
          '<option value="admin" ' + (u.role === 'admin' ? 'selected' : '') + '>Ausbilder</option>' +
        '</select>' +
      '</td>' +
      '<td class="px-5 py-3">' +
        '<input type="text" value="' + (u.title || '') + '" placeholder="z.B. Dozent" onblur="window.updateUserTitle(\'' + u.id + '\', this.value)" class="px-2 py-1 bg-gray-950 border border-gray-700 rounded-lg text-xs text-gray-200 w-32 focus:border-brand-500 focus:outline-none">' +
      '</td>' +
      '<td class="px-5 py-3 text-xs text-gray-500">' + new Date(u.created_at || Date.now()).toLocaleDateString('de-DE') + '</td>' +
    '</tr>';
  }).join('');
};

window.updateUserRole = async function(userId, newRole) {
  await supabase.from('users').update({ role: newRole }).eq('id', userId);
  showToast('Rolle aktualisiert! 👤');
};

window.updateUserTitle = async function(userId, newTitle) {
  await supabase.from('users').update({ title: newTitle }).eq('id', userId);
  showToast('Dozenten-Titel gespeichert! 🏷️');
};

window.renderStats = function() {
  const sta = document.getElementById('statTotalAttempts');
  if (sta) sta.textContent = allAttempts.length;
  const sau = document.getElementById('statActiveUsers');
  if (sau) sau.textContent = allUsers.length;
  const passedCount = allAttempts.filter(a => a.passed || a.percentage >= 80).length;
  const rate = allAttempts.length > 0 ? Math.round((passedCount / allAttempts.length) * 100) : 0;
  const spr = document.getElementById('statPassRate');
  if (spr) spr.textContent = rate + ' %';

  const tbody = document.getElementById('attemptsTableBody');
  if (!tbody) return;
  if (allAttempts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="px-5 py-6 text-center text-gray-500">Noch keine Prüfungen absolviert</td></tr>';
    return;
  }
  tbody.innerHTML = allAttempts.slice(0, 15).map(a => {
    const isPassed = a.passed || a.percentage >= 80;
    return '<tr class="hover:bg-gray-800/50">' +
      '<td class="px-5 py-3 text-gray-400 text-xs">' + new Date(a.timestamp).toLocaleString('de-DE') + '</td>' +
      '<td class="px-5 py-3 font-semibold text-white">' + a.category + '</td>' +
      '<td class="px-5 py-3 text-gray-300">' + a.score + ' / ' + a.total + '</td>' +
      '<td class="px-5 py-3 font-bold ' + (isPassed ? 'text-brand-400' : 'text-red-400') + '">' + (a.percentage || Math.round((a.score/a.total)*100)) + ' %</td>' +
      '<td class="px-5 py-3"><span class="px-2.5 py-0.5 rounded-full text-xs font-bold ' +
        (isPassed ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30') + '">' +
        (isPassed ? 'Bestanden ✓' : 'Nicht bestanden ✕') + '</span></td>' +
    '</tr>';
  }).join('');
};

window.showToast = function(msg, isError = false) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  document.getElementById('toastMessage').textContent = msg;
  toast.className = 'fixed bottom-6 right-6 z-50 ' + (isError ? 'bg-red-600' : 'bg-brand-600') + ' text-white px-5 py-3 rounded-xl shadow-2xl font-semibold text-sm flex items-center gap-2.5 transform transition-all duration-300 translate-y-0 opacity-100';
  setTimeout(() => {
    toast.className = 'fixed bottom-6 right-6 z-50 bg-brand-600 text-white px-5 py-3 rounded-xl shadow-2xl font-semibold text-sm flex items-center gap-2.5 transform transition-all duration-300 translate-y-20 opacity-0 pointer-events-none';
  }, 3500);
};

// AUTOMATISCHER START BEIM LADEN
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDashboard);
} else {
  initDashboard();
}
