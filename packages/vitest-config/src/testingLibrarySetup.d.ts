export declare const CI_ASYNC_UTIL_TIMEOUT: number

export declare const getIsCi: () => boolean

export declare const applyCiAsyncUtilTimeout: (
  configureTestingLibrary: (options: {
    asyncUtilTimeout: number
  }) => void,
) => boolean
