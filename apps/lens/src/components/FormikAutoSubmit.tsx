import { useFormikContext } from "formik";
import { useEffect } from "react";

export default function FormikAutoSubmit() {
  const { values, handleSubmit } = useFormikContext();
  useEffect(() => {
    if (values) handleSubmit();
  }, [values, handleSubmit]);

  return null;
}
