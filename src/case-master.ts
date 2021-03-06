import { describe, it } from 'mocha'


/**
 * test case
 *
 * 测试用例
 */
export interface TestCase {
  /**
   * the path where the test case is located
   *
   * 测试用例所在的路径
   */
  readonly dir: string
  /**
   * title of test case
   *
   * 测试用例的标题
   */
  readonly title: string
}


/**
 * test case group
 *
 * 测试用例组
 */
export interface TestCaseGroup<I extends TestCase, G extends TestCaseGroup<I, G>> {
  /**
   * title of test case group
   *
   * 测试用例组的标题
   */
  readonly title: string
  /**
   * sub test group
   *
   * 子测试组
   */
  readonly subGroups: TestCaseGroup<I, G>[]
  /**
   * test cases of current group
   *
   * 组内的测试用例
   */
  readonly cases: I[]
}


/**
 * handler of TestCase
 */
export type TestCaseHandleFunc<I extends TestCase> = (kase: I) => void | Promise<void>


export abstract class TestCaseMaster<I extends TestCase, G extends TestCaseGroup<I, G>> {
  protected readonly _caseGroups: G[]
  protected readonly caseRootDirectory: string

  public constructor(caseRootDirectory: string) {
    this._caseGroups = []
    this.caseRootDirectory = caseRootDirectory
  }

  /**
   * Scan test case directories to generate test case entries
   *
   * 扫描测试用例目录，生成测试用例条目
   * @param dir       测试用例目录（绝对路径）
   * @param recursive 是否递归扫描
   */
  public abstract async scan(caseDirectory: string, recursive: boolean): Promise<this>

  /**
   * get the list of TestCaseGroup
   */
  public collect(): G[] {
    return [...this._caseGroups]
  }

  /**
   * collect the list of TestCaseGroup, and flat them to a list of TestCase
   */
  public collectAndFlat(): I[] {
    const recursiveCollect = (kaseGroup: G): I[] => {
      const cases: I[] = []
      if (kaseGroup.cases != null) {
        cases.push(...kaseGroup.cases)
      }
      if (kaseGroup.subGroups !== null) {
        for (const subGroup of kaseGroup.subGroups) {
          cases.push(...recursiveCollect(subGroup as G))
        }
      }
      return cases
    }

    const cases: I[] = []
    for (const testGroup of this._caseGroups) {
      cases.push(...recursiveCollect(testGroup))
    }

    return cases
  }

  /**
   * generate answers
   * @param doAnswer
   */
  public async answer(doAnswer?: TestCaseHandleFunc<I>): Promise<void> {
    const self = this
    const answer = async (caseGroup: G) => {
      // test group.cases
      for (const kase of caseGroup.cases) {
        if (doAnswer != null) doAnswer(kase)
      }
      // test sub groups
      for (const subGroup of caseGroup.subGroups) {
        await answer(subGroup as G)
      }
    }

    // generate answers
    for (const caseGroup of self._caseGroups) {
      await answer(caseGroup)
    }
  }

  /**
   * run test
   * @param doTest
   */
  public test(doTest?: TestCaseHandleFunc<I>) {
    const self = this
    const test = (caseGroup: G) => {
      describe(caseGroup.title, function () {
        // test group.cases
        for (const kase of caseGroup.cases) {
          it(kase.title, function () {
            if (doTest != null) doTest(kase)
          })
        }
        // test sub groups
        for (const subGroup of caseGroup.subGroups) {
          test(subGroup as G)
        }
      })
    }

    // run test
    for (const caseGroup of self._caseGroups) {
      test(caseGroup)
    }
  }
}
