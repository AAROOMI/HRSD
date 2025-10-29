
import * as React from 'react';
import { QRCodeCanvas } from 'qrcode.react';

interface QRCodeProps {
  value: string | object;
}

const QRCode: React.FC<QRCodeProps> = ({ value }) => {
  const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;

  return (
    <QRCodeCanvas
      value={stringValue}
      size={80}
      bgColor={"#ffffff"}
      fgColor={"#000000"}
      level={"L"}
      includeMargin={false}
    />
  );
};

export default QRCode;