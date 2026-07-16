import { describe, it, expect } from 'vitest';
import { buildMarchString, isExtensionDisabled, getExtensionDisabledReason } from '../marchBuilder';
import { CpuCore } from '../../data/cores';

describe('buildMarchString', () => {
  const mockCore32FD: CpuCore = {
    name: 'N300FD',
    arch: 'rv32imafdc',
    abi: 'ilp32d',
    series: 'nuclei-300-series',
  };

  const mockCore32: CpuCore = {
    name: 'N300',
    arch: 'rv32imac',
    abi: 'ilp32',
    series: 'nuclei-300-series',
  };

  const mockCore64FD: CpuCore = {
    name: 'NX600FD',
    arch: 'rv64imafdc',
    abi: 'lp64d',
    series: 'nuclei-600-series',
  };

  const mockCore100: CpuCore = {
    name: 'N100',
    arch: 'rv32ic',
    abi: 'ilp32',
    series: 'nuclei-100-series',
  };

  it('generates standard march for default core', () => {
    const selected = new Set<string>();
    const result = buildMarchString(mockCore32FD, selected);
    expect(result.march).toBe('rv32imafdc');
    expect(result.mabi).toBe('ilp32d');
  });

  it('strips c from core arch if zcmp is selected', () => {
    const selected = new Set<string>(['zcmp', 'zca', 'zcb']);
    const result = buildMarchString(mockCore32FD, selected);
    expect(result.march).toContain('rv32imafd_');
    expect(result.march).not.toContain('rv32imafdc');
    expect(result.march).toContain('_zca_zcb_zcmp');
  });

  it('appends v directly to single-character extensions when V standard vector is selected', () => {
    const selected = new Set<string>(['v']);
    const result = buildMarchString(mockCore64FD, selected);
    // order: i, m, a, f, d, c, v
    expect(result.march.startsWith('rv64imafdcv')).toBe(true);
  });

  it('folds DSP extensions to the highest selected level', () => {
    const selected = new Set<string>(['xxldsp', 'xxldspn1x', 'xxldspn2x', 'xxldspn3x']);
    const result = buildMarchString(mockCore32, selected);
    expect(result.march).toBe('rv32imac_xxldspn3x');
  });

  it('folds Scalar Crypto to zk and zks', () => {
    const selected = new Set<string>([
      'zbkb', 'zbkc', 'zbkx', 'zknd', 'zkne', 'zknh', 'zksed', 'zksh', 'zkr', 'zkt'
    ]);
    const result = buildMarchString(mockCore64FD, selected);
    expect(result.march).toBe('rv64imafdc_zk_zks');
  });

  it('folds Scalar Crypto to zkn when missing national/SM algorithms and zkr/zkt', () => {
    const selected = new Set<string>([
      'zbkb', 'zbkc', 'zbkx', 'zknd', 'zkne', 'zknh'
    ]);
    const result = buildMarchString(mockCore64FD, selected);
    expect(result.march).toBe('rv64imafdc_zkn');
  });

  it('folds Scalar Crypto to zkn_zks when zkr/zkt are missing', () => {
    const selected = new Set<string>([
      'zbkb', 'zbkc', 'zbkx', 'zknd', 'zkne', 'zknh', 'zksed', 'zksh'
    ]);
    const result = buildMarchString(mockCore64FD, selected);
    expect(result.march).toBe('rv64imafdc_zkn_zks');
  });

  it('folds Vector Crypto to zvknc', () => {
    // zvkn = zvkned + zvknhb + zvkb + zvkt
    // zvknc = zvkn + zvbc
    const selected = new Set<string>([
      'zve64d', // vector extension >= zve64x
      'zvkned', 'zvknhb', 'zvkb', 'zvkt', 'zvbc'
    ]);
    const result = buildMarchString(mockCore64FD, selected);
    expect(result.march).toContain('_zve64d_zvknc');
  });

  it('sorts standard extensions alphabetically and custom extensions at the end', () => {
    const selected = new Set<string>([
      'xxldsp', 'zba', 'zbb', 'zicbom', 'xxlfbf'
    ]);
    const result = buildMarchString(mockCore32FD, selected);
    // zba, zbb, zicbom should be alphabetically sorted standard Z extensions
    // xxldsp, xxlfbf should be alphabetically sorted custom X extensions at the end
    expect(result.march).toBe('rv32imafdc_zba_zbb_zicbom_xxldsp_xxlfbf');
  });

  it('checks disabling and compatibility rules correctly', () => {
    // Zmmul should be enabled only on N100 series without M
    const selected = new Set<string>();
    expect(isExtensionDisabled('zmmul', selected, mockCore100)).toBe(false);
    expect(isExtensionDisabled('zmmul', selected, mockCore32)).toBe(true); // 300 series has M

    // Zcf is only valid on RV32 with float
    expect(isExtensionDisabled('zcf', selected, mockCore32FD)).toBe(false); // RV32 with F
    expect(isExtensionDisabled('zcf', selected, mockCore64FD)).toBe(true);  // RV64

    // Vector Crypto requires a vector extension
    expect(isExtensionDisabled('zvbb', selected, mockCore64FD)).toBe(true);
    selected.add('zve32x');
    expect(isExtensionDisabled('zvbb', selected, mockCore64FD)).toBe(false);
  });
});
