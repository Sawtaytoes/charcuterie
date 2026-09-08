export type DecisionRecordProblem = {
  filePath: string
  rule: string
  message: string
}

export declare const lintDecisionRecord: (
  filePath: string,
  contents: string,
  indexContents: string | null,
) => DecisionRecordProblem[]

export declare const lintDecisionRecords: (
  filePaths: string[],
) => Promise<DecisionRecordProblem[]>
