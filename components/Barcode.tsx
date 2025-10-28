import * as React from 'react';
import Barcode from 'react-barcode';

interface BarcodeProps {
  value: string;
}

const BarcodeComponent: React.FC<BarcodeProps> = ({ value }) => {
  return (
    <Barcode 
      value={value}
      format="CODE128"
      width={2}
      height={40}
      displayValue={false}
      margin={0}
      background="#ffffff"
      lineColor="#000000"
    />
  );
};

export default BarcodeComponent;