/**
 * Tests for runestone encoder
 *
 * Verifies that JavaScript encoding matches the expected format.
 */

import { describe, it, expect } from 'vitest';
import {
  encodeVarint,
  encodeVarintList,
  splitBytes,
  joinToBytes,
  encodeCellpack,
  protostoneToIntegers,
  encipherProtostones,
  encipherRunestone,
  scriptToHex,
  Tag,
  type Protostone,
} from '../runestone-encoder';

describe('LEB128 Varint Encoding', () => {
  it('encodes small numbers correctly', () => {
    expect(Array.from(encodeVarint(0))).toEqual([0]);
    expect(Array.from(encodeVarint(1))).toEqual([1]);
    expect(Array.from(encodeVarint(127))).toEqual([127]);
  });

  it('encodes multi-byte numbers correctly', () => {
    // 128 = 0x80 -> [0x80, 0x01]
    expect(Array.from(encodeVarint(128))).toEqual([0x80, 0x01]);
    // 300 = 0x12C -> [0xAC, 0x02]
    expect(Array.from(encodeVarint(300))).toEqual([0xac, 0x02]);
    // 16383 (Tag.Protocol) -> [0xFF, 0x7F]
    expect(Array.from(encodeVarint(16383))).toEqual([0xff, 0x7f]);
  });

  it('encodes bigint correctly', () => {
    expect(Array.from(encodeVarint(0n))).toEqual([0]);
    expect(Array.from(encodeVarint(128n))).toEqual([0x80, 0x01]);
  });
});

describe('Bytes <-> u128 Conversion', () => {
  it('splits bytes into u128 chunks of 15 bytes', () => {
    const bytes = new Uint8Array([1, 2, 3, 4, 5]);
    const result = splitBytes(bytes);
    expect(result.length).toBe(1);
    // 1 + 2*256 + 3*256^2 + 4*256^3 + 5*256^4
    expect(result[0]).toBe(1n + 2n * 256n + 3n * 65536n + 4n * 16777216n + 5n * 4294967296n);
  });

  it('handles bytes longer than 15', () => {
    const bytes = new Uint8Array(20).fill(1);
    const result = splitBytes(bytes);
    expect(result.length).toBe(2);
  });

  it('joinToBytes is inverse of splitBytes for aligned data', () => {
    const original = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]);
    const split = splitBytes(original);
    const joined = joinToBytes(split);
    // joinToBytes always produces 15 bytes per value
    expect(Array.from(joined.slice(0, 15))).toEqual(Array.from(original));
  });
});

describe('Cellpack Encoding', () => {
  it('encodes cellpack values as u128 LE', () => {
    const result = encodeCellpack([2, 0, 77, 1]);
    expect(result.length).toBe(64); // 4 values * 16 bytes each

    // First value: 2
    expect(result[0]).toBe(2);
    expect(result[1]).toBe(0);

    // Second value: 0
    expect(result[16]).toBe(0);

    // Third value: 77
    expect(result[32]).toBe(77);

    // Fourth value: 1
    expect(result[48]).toBe(1);
  });
});

describe('Protostone Encoding', () => {
  it('converts protostone to integers', () => {
    const stone: Protostone = {
      protocolTag: 1n,
      message: new Uint8Array([1, 2, 3]),
      pointer: 0,
      refund: 0,
      edicts: [],
    };

    const integers = protostoneToIntegers(stone);

    // Should have ProtoPointer, value, Refund, value, Message, value
    expect(integers.length).toBe(6);
    expect(integers[0]).toBe(Tag.ProtoPointer); // 91n
    expect(integers[1]).toBe(0n); // pointer value
    expect(integers[2]).toBe(Tag.Refund); // 93n
    expect(integers[3]).toBe(0n); // refund value
    expect(integers[4]).toBe(Tag.Message); // 81n
  });

  it('enciphers protostones', () => {
    const stone: Protostone = {
      protocolTag: 1n,
      message: encodeCellpack([2, 0, 77, 1]),
      pointer: 0,
      refund: 0,
      edicts: [],
    };

    const result = encipherProtostones([stone]);

    // Should return array of u128 values
    expect(result.length).toBeGreaterThan(0);
    expect(typeof result[0]).toBe('bigint');
  });
});

describe('Runestone Encoding', () => {
  it('creates valid OP_RETURN script', () => {
    const protocolValues = [1n, 2n, 3n];
    const script = encipherRunestone(protocolValues, 0);

    // Should start with OP_RETURN (0x6a) and OP_13 (0x5d)
    expect(script[0]).toBe(0x6a);
    expect(script[1]).toBe(0x5d);
  });
});

describe('Tag Constants', () => {
  it('has correct tag values from Rust', () => {
    expect(Tag.Body).toBe(0n);
    expect(Tag.Pointer).toBe(22n);
    expect(Tag.Protocol).toBe(16383n);
    expect(Tag.Message).toBe(81n);
    expect(Tag.Burn).toBe(83n);
    expect(Tag.ProtoPointer).toBe(91n);
    expect(Tag.Refund).toBe(93n);
    expect(Tag.From).toBe(95n);
  });
});
