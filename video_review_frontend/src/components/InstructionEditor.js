

import React, { useEffect, useState } from 'react';
import axios from 'axios';

const InstructionEditor = () => {
  const [mode, setMode] = useState('video');
  const [instructions, setInstructions] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetchInstructions();
  }, [mode]);

  const fetchInstructions = async () => {
    try {
      const response = await axios.get(`/admin/instructions?mode=${mode}`);
      setInstructions(response.data.instructions || '');
      setStatus('');
    } catch (error) {
      console.error('Failed to load instructions:', error);
      setStatus('❌ Failed to load instructions.');
    }
  };

  const handleSave = async () => {
    try {
      await axios.post('/admin/instructions', { mode, instructions });
      setStatus('✅ Instructions saved successfully.');
    } catch (error) {
      console.error('Error saving instructions:', error);
      setStatus('❌ Failed to save instructions.');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h2>SILAS Instruction Editor</h2>
      <div>
        <label htmlFor="mode">Select Mode: </label>
        <select
          id="mode"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
        >
          <option value="video">Video</option>
          <option value="pdf">Storyboard</option>
          <option value="docx">Document</option>
        </select>
      </div>
      <br />
      <textarea
        rows={20}
        cols={100}
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
        placeholder="Loading..."
      />
      <br />
      <button onClick={handleSave}>Save Instructions</button>
      <div style={{ marginTop: '1rem', color: 'green' }}>{status}</div>
    </div>
  );
};

export default InstructionEditor;