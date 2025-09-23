
'use client';

import React, { useRef, useEffect } from 'react';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { Input } from './input';
import { useController, useFormContext, FormProvider, useForm, FieldValues } from 'react-hook-form';

interface AddressAutocompleteInputProps {
  name: string;
  placeholder?: string;
}

const libraries: ('places' | 'drawing' | 'geometry' | 'localContext' | 'visualization')[] = ['places'];

function ControlledAddressAutocompleteInput({ name, placeholder }: AddressAutocompleteInputProps) {
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
      field.onChange(formattedAddress);
    }
  };

  if (loadError) return <Input placeholder="Error loading maps" disabled />;
  if (!isLoaded) return <Input placeholder={placeholder || 'Loading...'} disabled />;

  return (
    <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged} fields={["formatted_address"]}>
      <Input
        {...field}
        placeholder={placeholder}
        onChange={(e) => field.onChange(e.target.value)}
        value={field.value || ''}
      />
    </Autocomplete>
  );
}

export function AddressAutocompleteInput({ name, placeholder }: AddressAutocompleteInputProps) {
    const formMethods = useFormContext();
    
    // If we're already inside a form context, we don't need another provider.
    if (formMethods) {
        return <ControlledAddressAutocompleteInput name={name} placeholder={placeholder} />;
    }

    // This is a fallback for when the component is not used inside a FormProvider
    const newFormMethods = useForm();
    return (
        <FormProvider {...newFormMethods}>
            <ControlledAddressAutocompleteInput name={name} placeholder={placeholder} />
        </FormProvider>
    )
}
