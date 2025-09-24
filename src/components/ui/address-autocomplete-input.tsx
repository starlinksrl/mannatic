
'use client';

import React, { useRef, useEffect } from 'react';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { Input } from './input';
import { useFormContext, useController } from 'react-hook-form';

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
  const { field } = useController({ name, control });

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const onLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const onPlaceChanged = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      const formattedAddress = place.formatted_address || '';
      setValue(name, formattedAddress, { shouldValidate: true, shouldDirty: true });
    }
  };

  if (loadError) return <Input placeholder="Error loading maps" disabled />;
  if (!isLoaded) return <Input placeholder={placeholder || 'Loading...'} disabled />;

  return (
    <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged} fields={["formatted_address"]}>
      <Input
        {...field}
        placeholder={placeholder}
        onChange={(e) => field.onChange(e.target.value)} // Ensure typing in the input updates the form state
        value={field.value || ''}
      />
    </Autocomplete>
  );
}
