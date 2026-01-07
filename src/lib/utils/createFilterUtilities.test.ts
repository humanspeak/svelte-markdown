import { describe, expect, it } from 'vitest'
import { createFilterUtilities } from './createFilterUtilities.js'

// Mock components for testing
const MockUnsupported = () => null
const MockComponentA = () => 'A'
const MockComponentB = () => 'B'
const MockComponentC = () => 'C'
const MockCustom = () => 'Custom'

// Test keys and defaults
const testKeys = ['a', 'b', 'c'] as const
type TestKey = (typeof testKeys)[number]
type TestResult = Record<TestKey, (() => string | null) | null>

const testDefaults: Record<TestKey, () => string | null> = {
    a: MockComponentA,
    b: MockComponentB,
    c: MockComponentC
}

describe('createFilterUtilities', () => {
    const { buildUnsupported, allowOnly, excludeOnly } = createFilterUtilities<TestKey, TestResult>(
        testKeys,
        MockUnsupported,
        testDefaults
    )

    describe('buildUnsupported', () => {
        it('returns all keys mapped to unsupported component', () => {
            const result = buildUnsupported()
            expect(result.a).toBe(MockUnsupported)
            expect(result.b).toBe(MockUnsupported)
            expect(result.c).toBe(MockUnsupported)
        })

        it('includes all defined keys', () => {
            const result = buildUnsupported()
            expect(Object.keys(result)).toHaveLength(3)
            expect(Object.keys(result)).toEqual(['a', 'b', 'c'])
        })

        it('returns a new object each time', () => {
            const result1 = buildUnsupported()
            const result2 = buildUnsupported()
            expect(result1).not.toBe(result2)
        })
    })

    describe('allowOnly', () => {
        it('allows specified key with default component', () => {
            const result = allowOnly(['a'])
            expect(result.a).toBe(MockComponentA)
            expect(result.b).toBe(MockUnsupported)
            expect(result.c).toBe(MockUnsupported)
        })

        it('allows multiple keys with default components', () => {
            const result = allowOnly(['a', 'c'])
            expect(result.a).toBe(MockComponentA)
            expect(result.b).toBe(MockUnsupported)
            expect(result.c).toBe(MockComponentC)
        })

        it('allows key with custom component via tuple', () => {
            const result = allowOnly([['a', MockCustom]])
            expect(result.a).toBe(MockCustom)
            expect(result.b).toBe(MockUnsupported)
            expect(result.c).toBe(MockUnsupported)
        })

        it('allows mix of default and custom components', () => {
            const result = allowOnly(['a', ['b', MockCustom]])
            expect(result.a).toBe(MockComponentA)
            expect(result.b).toBe(MockCustom)
            expect(result.c).toBe(MockUnsupported)
        })

        it('ignores invalid keys', () => {
            const result = allowOnly(['a', 'invalid' as TestKey])
            expect(result.a).toBe(MockComponentA)
            expect(result.b).toBe(MockUnsupported)
            expect(result.c).toBe(MockUnsupported)
            expect(result).not.toHaveProperty('invalid')
        })

        it('ignores invalid keys in tuples', () => {
            const result = allowOnly([['invalid' as TestKey, MockCustom]])
            expect(result.a).toBe(MockUnsupported)
            expect(result.b).toBe(MockUnsupported)
            expect(result.c).toBe(MockUnsupported)
        })

        it('returns all unsupported when empty array provided', () => {
            const result = allowOnly([])
            expect(result.a).toBe(MockUnsupported)
            expect(result.b).toBe(MockUnsupported)
            expect(result.c).toBe(MockUnsupported)
        })

        it('allows null as custom component', () => {
            const result = allowOnly([['a', null]])
            expect(result.a).toBe(null)
        })
    })

    describe('excludeOnly', () => {
        it('excludes specified key', () => {
            const result = excludeOnly(['a'])
            expect(result.a).toBe(MockUnsupported)
            expect(result.b).toBe(MockComponentB)
            expect(result.c).toBe(MockComponentC)
        })

        it('excludes multiple keys', () => {
            const result = excludeOnly(['a', 'c'])
            expect(result.a).toBe(MockUnsupported)
            expect(result.b).toBe(MockComponentB)
            expect(result.c).toBe(MockUnsupported)
        })

        it('keeps all defaults when empty array provided', () => {
            const result = excludeOnly([])
            expect(result.a).toBe(MockComponentA)
            expect(result.b).toBe(MockComponentB)
            expect(result.c).toBe(MockComponentC)
        })

        it('applies overrides to non-excluded keys', () => {
            const result = excludeOnly(['a'], [['b', MockCustom]])
            expect(result.a).toBe(MockUnsupported)
            expect(result.b).toBe(MockCustom)
            expect(result.c).toBe(MockComponentC)
        })

        it('exclusions take precedence over overrides', () => {
            const result = excludeOnly(['a'], [['a', MockCustom]])
            expect(result.a).toBe(MockUnsupported)
        })

        it('ignores invalid keys in exclusions', () => {
            const result = excludeOnly(['invalid' as TestKey])
            expect(result.a).toBe(MockComponentA)
            expect(result.b).toBe(MockComponentB)
            expect(result.c).toBe(MockComponentC)
        })

        it('ignores invalid keys in overrides', () => {
            const result = excludeOnly([], [['invalid' as TestKey, MockCustom]])
            expect(result.a).toBe(MockComponentA)
            expect(result.b).toBe(MockComponentB)
            expect(result.c).toBe(MockComponentC)
            expect(result).not.toHaveProperty('invalid')
        })

        it('applies multiple overrides', () => {
            const result = excludeOnly(
                ['a'],
                [
                    ['b', MockCustom],
                    ['c', null]
                ]
            )
            expect(result.a).toBe(MockUnsupported)
            expect(result.b).toBe(MockCustom)
            expect(result.c).toBe(null)
        })
    })

    describe('factory isolation', () => {
        it('creates independent instances', () => {
            const otherKeys = ['x', 'y'] as const
            type OtherKey = (typeof otherKeys)[number]
            const OtherDefault = () => 'Other'
            const OtherUnsupported = () => 'OtherUnsupported'

            const otherDefaults: Record<OtherKey, () => string> = {
                x: OtherDefault,
                y: OtherDefault
            }

            const other = createFilterUtilities<OtherKey, Record<OtherKey, () => string>>(
                otherKeys,
                OtherUnsupported,
                otherDefaults
            )

            const originalResult = buildUnsupported()
            const otherResult = other.buildUnsupported()

            expect(Object.keys(originalResult)).toEqual(['a', 'b', 'c'])
            expect(Object.keys(otherResult)).toEqual(['x', 'y'])
            expect(originalResult.a).toBe(MockUnsupported)
            expect(otherResult.x).toBe(OtherUnsupported)
        })
    })
})
