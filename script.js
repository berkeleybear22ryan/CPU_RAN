document.addEventListener('DOMContentLoaded', () => {
  // Global Variables
  let assemblyCodeList = [];
  let cycleData = [];
  let currentCycle = 0;
  let isPlaying = true;
  let playInterval;
  let instructionHits = {};
  let pipelineStages = {};
  let totalCycles = 0;
  let programsList = [];
  let currentProgram = 'fib';
  let maxHitCount = 0; // For scaling the histogram

  // DOM Elements
  const programSelect = document.getElementById('program-select');
  const programTitle = document.getElementById('program-title');
  const cycleDisplay = document.getElementById('cycle-display');
  const playPauseButton = document.getElementById('play-pause');
  const cpsInput = document.getElementById('cps-input');
  const codeLinesContainer = document.getElementById('code-lines');
  const lineNumbersContainer = document.getElementById('line-numbers');

  // Set default speed to 5 cycles/sec
  cpsInput.value = 5;

  // Load Programs List
  fetch('programs.json')
    .then(res => res.json())
    .then(data => {
      programsList = data.programs;
      populateProgramSelect();
      loadProgram(currentProgram);
    })
    .catch(error => console.error('Error loading programs:', error));

  // Event Listeners
  programSelect.addEventListener('change', () => {
    currentProgram = programSelect.value;
    loadProgram(currentProgram);
  });
  document.getElementById('prev-cycle').addEventListener('click', prevCycle);
  document.getElementById('play-pause').addEventListener('click', togglePlayPause);
  document.getElementById('next-cycle').addEventListener('click', nextCycle);
  cpsInput.addEventListener('change', adjustPlaybackSpeed);

  // Functions to populate program select
  function populateProgramSelect() {
    programSelect.innerHTML = '';
    programsList.forEach(program => {
      const option = document.createElement('option');
      option.value = program;
      option.textContent = program;
      programSelect.appendChild(option);
    });
    programSelect.value = currentProgram;
  }

  // Load Program Data
  function loadProgram(programName) {
    // Reset Variables
    assemblyCodeList = [];
    cycleData = [];
    currentCycle = 0;
    instructionHits = {};
    pipelineStages = {};
    totalCycles = 0;
    isPlaying = true;
    maxHitCount = 0;
    if (playInterval) clearInterval(playInterval);

    // Update Program Title
    programTitle.textContent = `${programName}/assembly_code.txt —-> RV32I 4 STAGE CORE`;

    // Load Data
    Promise.all([
      fetch(`program/${programName}/assembly_code.txt`).then(res => res.text()),
      fetch(`program/${programName}/pc_stages.txt`).then(res => res.text())
    ])
      .then(([assemblyText, cycleText]) => {
        parseAssemblyCode(assemblyText);
        parseCycleData(cycleText);
        totalCycles = cycleData.length;
        displayAssemblyCode();
        updateCycleDisplay();
        if (isPlaying) {
          playPauseButton.textContent = 'Pause';
          playCycles();
        }
      })
      .catch(error => console.error('Error loading program data:', error));
  }

  // Parsing Functions
  function parseAssemblyCode(text) {
    assemblyCodeList = [];
    const lines = text.split('\n');
    lines.forEach((line, index) => {
      if (line.trim() !== '') {
        // Assuming the format: PC: Instruction
        const [pcPart, ...instructionParts] = line.split(':');
        const pc = parseInt(pcPart.trim());
        const instructionText = instructionParts.join(':').trim();
        assemblyCodeList.push({
          lineNumber: index + 1,
          pc: pc,
          instruction: instructionText
        });
      }
    });
  }

  function parseCycleData(text) {
    cycleData = [];
    const lines = text.split('\n');
    let currentCycleData = {};
    lines.forEach(line => {
      if (line.startsWith('Cycle:')) {
        if (Object.keys(currentCycleData).length > 0) {
          cycleData.push(currentCycleData);
        }
        currentCycleData = {};
      } else if (line.includes(':')) {
        const [key, value] = line.split(':');
        const stageKey = key.trim();
        const pcValue = parseInt(value.trim());
        if (stageKey.includes('pc_from_stage_0_in_stage_0')) {
          currentCycleData['Stage 0'] = pcValue;
        } else if (stageKey.includes('pc_from_stage_0_in_stage_1')) {
          currentCycleData['Stage 1'] = pcValue;
        } else if (stageKey.includes('pc_from_stage_0_in_stage_2')) {
          currentCycleData['Stage 2'] = pcValue;
        } else if (stageKey.includes('pc_from_stage_0_in_stage_3')) {
          currentCycleData['Stage 3'] = pcValue;
        } else if (stageKey.includes('mux_data_from_stage_3_in_stage_3')) {
          currentCycleData['MUX'] = parseInt(value.trim());
        }
      }
    });
    if (Object.keys(currentCycleData).length > 0) {
      cycleData.push(currentCycleData);
    }
  }

  // Display Functions
  function displayAssemblyCode() {
    codeLinesContainer.innerHTML = '';
    lineNumbersContainer.innerHTML = '';
    assemblyCodeList.forEach((item, index) => {
      // Line Numbers
      const lineNumberElement = document.createElement('div');
      lineNumberElement.classList.add('line-number');
      lineNumberElement.textContent = item.lineNumber;
      lineNumbersContainer.appendChild(lineNumberElement);

      // Code Lines
      const codeLineElement = document.createElement('div');
      codeLineElement.classList.add('code-line', 'unhit');
      codeLineElement.dataset.pc = item.pc;

      // Instruction
      const instructionSpan = document.createElement('span');
      instructionSpan.classList.add('instruction');
      instructionSpan.textContent = `${item.pc}: ${item.instruction}`;
      codeLineElement.appendChild(instructionSpan);

      // Histogram Bar
      const histogramBar = document.createElement('div');
      histogramBar.classList.add('histogram-bar');
      histogramBar.style.width = '0px'; // Initial width
      codeLineElement.appendChild(histogramBar);

      // Stage Label
      const stageLabelSpan = document.createElement('span');
      stageLabelSpan.classList.add('stage-label');
      codeLineElement.appendChild(stageLabelSpan);

      // MUX Data
      const muxDataSpan = document.createElement('span');
      muxDataSpan.classList.add('mux-data');
      codeLineElement.appendChild(muxDataSpan);

      // Hit Count
      const hitCountSpan = document.createElement('span');
      hitCountSpan.classList.add('hit-count');
      hitCountSpan.textContent = `Hits: 0`;
      codeLineElement.appendChild(hitCountSpan);

      codeLinesContainer.appendChild(codeLineElement);
    });
  }

  function updateCycleDisplay() {
    cycleDisplay.textContent = `Cycle: ${currentCycle}`;
    updatePipelineStages();
    updateInstructionHits();
    updateHistogram(); // Update histogram after hits are updated
  }

  function updatePipelineStages() {
    const cycleStages = cycleData[currentCycle];
    if (!cycleStages) {
      console.warn(`No data for cycle ${currentCycle}`);
      return;
    }

    pipelineStages = {};

    // Clear previous stage highlights and labels
    document.querySelectorAll('.code-line').forEach(elem => {
      elem.classList.remove('stage-0', 'stage-1', 'stage-2', 'stage-3');
      const stageLabel = elem.querySelector('.stage-label');
      if (stageLabel) stageLabel.textContent = '';
      const muxData = elem.querySelector('.mux-data');
      if (muxData) muxData.textContent = '';
    });

    // Highlight instructions for each stage
    ['Stage 0', 'Stage 1', 'Stage 2', 'Stage 3'].forEach((stage, index) => {
      const pcValue = cycleStages[stage];
      if (pcValue !== undefined) {
        pipelineStages[pcValue] = stage;
        const codeLineElement = document.querySelector(`.code-line[data-pc='${pcValue}']`);
        if (codeLineElement) {
          codeLineElement.classList.add(`stage-${index}`);
          codeLineElement.classList.remove('unhit');

          // Update stage label
          const stageLabel = codeLineElement.querySelector('.stage-label');
          stageLabel.textContent = `${stage}`;

          // For Stage 3, display MUX data if available
          if (stage === 'Stage 3') {
            const muxData = cycleStages['MUX'];
            if (muxData !== undefined) {
              const muxDataSpan = codeLineElement.querySelector('.mux-data');
              muxDataSpan.textContent = `Value: ${muxData}`;
            }

            // Scroll to the Stage 3 line
            codeLinesContainer.scrollTop = codeLineElement.offsetTop - codeLinesContainer.offsetTop - (codeLinesContainer.clientHeight / 2) + (codeLineElement.clientHeight / 2);
          }
        }
      }
    });
  }

  function updateInstructionHits() {
    // Update hit counts
    assemblyCodeList.forEach(item => {
      const codeLineElement = document.querySelector(`.code-line[data-pc='${item.pc}']`);
      if (codeLineElement) {
        instructionHits[item.pc] = instructionHits[item.pc] || 0;
        if (pipelineStages[item.pc]) {
          instructionHits[item.pc]++;
        }

        // Update hit count display
        const hitCountSpan = codeLineElement.querySelector('.hit-count');
        hitCountSpan.textContent = `Hits: ${instructionHits[item.pc]}`;

        // Update hit/unhit classes
        if (instructionHits[item.pc] > 0) {
          codeLineElement.classList.remove('unhit');
        }
      }
    });
  }

  function updateHistogram() {
    // Find the maximum hit count to scale the histogram
    maxHitCount = Math.max(...Object.values(instructionHits), 1);

    // Update histogram bars
    assemblyCodeList.forEach(item => {
      const codeLineElement = document.querySelector(`.code-line[data-pc='${item.pc}']`);
      if (codeLineElement) {
        const histogramBar = codeLineElement.querySelector('.histogram-bar');
        const hitCount = instructionHits[item.pc] || 0;
        const widthPercentage = (hitCount / maxHitCount) * 100; // Scale to 100%
        histogramBar.style.width = `${(widthPercentage / 100) * parseInt(getComputedStyle(document.documentElement).getPropertyValue('--histogram-max-width'))}px`;
      }
    });
  }

  // Control Functions
  function togglePlayPause() {
    isPlaying = !isPlaying;
    if (isPlaying) {
      playPauseButton.textContent = 'Pause';
      playCycles();
    } else {
      playPauseButton.textContent = 'Play';
      pauseCycles();
    }
  }

  function playCycles() {
    const cps = parseInt(cpsInput.value) || 1;
    const interval = 1000 / cps;
    playInterval = setInterval(() => {
      nextCycle();
      if (currentCycle >= cycleData.length - 1) {
        clearInterval(playInterval);
        isPlaying = false;
        playPauseButton.textContent = 'Play';
      }
    }, interval);
  }

  function pauseCycles() {
    clearInterval(playInterval);
  }

  function nextCycle() {
    if (currentCycle < cycleData.length - 1) {
      currentCycle++;
      updateCycleDisplay();
    }
  }

  function prevCycle() {
    if (currentCycle > 0) {
      currentCycle--;
      updateCycleDisplay();
    }
  }

  function adjustPlaybackSpeed() {
    if (isPlaying) {
      clearInterval(playInterval);
      playCycles();
    }
  }
});
