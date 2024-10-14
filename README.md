# CPU Pipeline ASM Flow

## Overview

This project aims to create a visual representation of a CPU pipeline, specifically designed for RISC-V architecture. The goal is to provide an educational tool that helps students and enthusiasts understand the inner workings of a CPU pipeline.

## Features

- Simulates a basic multi-stage RISC-V pipeline
- Visualizes instruction flow through the pipeline stages
- Displays assembly code alongside the pipeline visualization
- Tracks instruction execution frequency
- Allows step-by-step progression through clock cycles

## Background

Modern CPUs use pipelining to improve instruction throughput. This project focuses on visualizing a simple pipeline for the RISC-V architecture, which has gained popularity in recent years due to its open-source nature and simplicity.

The visualizer simulates the following pipeline stages:

1. Instruction Fetch (IF)
2. Instruction Decode (ID)
3. Execute (EX)
4. Memory Access (MEM)
5. Write Back (WB)

## How It Works

The visualizer takes two input files:

1. `assembly_code.txt`: Contains RISC-V assembly instructions
2. `pc_stages.txt`: Provides information about the Program Counter (PC) at each pipeline stage for every clock cycle

Using these inputs, the visualizer creates a dynamic representation of how instructions move through the pipeline, helping users understand concepts such as pipeline hazards, stalls, and instruction parallelism.

## Future Improvements

- Add support for more complex pipeline structures
- Implement visualization of data hazards and forwarding
- Include a broader range of RISC-V instructions
- Provide more detailed statistics on pipeline performance

## License

This project is open-source and available under the MIT License.