
import React from 'react';
import Barcode from 'react-barcode';

interface BarcodeProps {
  value: string;
}

const BarcodeComponent: React.FC<BarcodeProps> = ({ value }) => {
  return (
    <Barcode 
      value={value}
      format="CODE128"
      width={1.5}
      height={30}
      displayValue={false}
      margin={0}
      background="#ffffff"
      lineColor="#000000"
    />
  );
};

export default BarcodeComponent;
