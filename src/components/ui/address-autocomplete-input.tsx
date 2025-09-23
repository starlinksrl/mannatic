
'use client';

import React, { useRef, useEffect } from 'react';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { Input } from './input';
import { useController, useFormContext } from 'react-hook-form';

interface AddressAutocompleteInputProps {
  name: string;
  placeholder?: string;
}

const libraries: ('places' | 'drawing' | 'geometry' | 'localContext' | 'visualization')[] = ['places'];

export function AddressAutocompleteInput({ name, placeholder }: AddressAutocompleteInputProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
    libraries,
  });

  const { control, setValue } = useFormContext();
  const { field } = useController({ name, control, defaultValue: '' });

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const onLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      const formattedAddress = place.formatted_address || '';
      setValue(name, formattedAddress, { shouldValidate: true, shouldDirty: true });
      // Manually trigger onChange to update the controlled component's internal state
      field.onChange(formattedAddress);
    }
  };

  if (loadError) return <div>Error loading maps</div>;
  if (!isLoaded) return <Input placeholder={placeholder || 'Loading...'} disabled />;

  return (
    <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged} fields={["formatted_address"]}>
      <Input
        {...field}
        placeholder={placeholder}
        onChange={(e) => {
            field.onChange(e.target.value);
        }}
      />
    </Autocomplete>
  );
}
