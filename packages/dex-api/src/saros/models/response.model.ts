export type Response<T> = {
  status: number;
  success: boolean;
  data: T;
};
