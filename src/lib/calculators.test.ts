import { describe, expect, it } from 'vitest';
import { calculatorById } from './calculators';

describe('electrical calculators', () => {
  it('calculates Ohm power and resistance', () => {
    const output = calculatorById('ohms-law')!.calculate({ voltage: '230', current: '10', resistance: '', power: '' });
    expect(output.headline).toBe('2300 W');
    expect(output.rows.find((row) => row.label === 'Resistance')?.value).toBe('23.00 Ω');
  });

  it('uses the conventional cooker diversity formula', () => {
    const output = calculatorById('cooker')!.calculate({ hob: '7.2', oven: '2', socket: 'true' });
    expect(output.headline).toBe('24.0 A');
  });

  it('calculates Zs from Ze and R1+R2', () => {
    const output = calculatorById('zs-pfc')!.calculate({ ze: '0.35', r1r2: '0.42', curve: 'B', rating: '32', rule80: 'true' });
    expect(output.headline).toBe('0.77 Ω');
  });

  it('checks a ring-final cross connection', () => {
    const output = calculatorById('r1r2')!.calculate({ mode: 'ring', ringR1: '0.62', ringRn: '0.63', ringR2: '1.02', line: '2.5', cpc: '1.5' });
    expect(output.headline).toBe('0.41 Ω');
  });

  it('applies the ring voltage-drop quarter factor', () => {
    const output = calculatorById('voltage-drop')!.calculate({ size: '2.5', length: '20', current: '20', phase: '1', circuit: 'ring' });
    expect(output.headline).toBe('1.80 V · 0.8%');
  });
});
