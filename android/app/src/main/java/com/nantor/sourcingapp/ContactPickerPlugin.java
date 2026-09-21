package com.nantor.sourcingapp;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.ContactsContract;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(
    name = "ContactPickerPlugin",
    permissions = {
        @Permission(
            alias = "contacts",
            strings = { Manifest.permission.READ_CONTACTS }
        )
    }
)
public class ContactPickerPlugin extends Plugin {

    @PluginMethod
    public void pickContact(PluginCall call) {
        if (getPermissionState("contacts") == PermissionState.GRANTED) {
            openContactPicker(call);
        } else {
            requestPermissionForAlias("contacts", call, "contactsPermissionCallback");
        }
    }

    @PermissionCallback
    private void contactsPermissionCallback(PluginCall call) {
        if (getPermissionState("contacts") == PermissionState.GRANTED) {
            openContactPicker(call);
        } else {
            call.reject("L’accès aux contacts est nécessaire pour importer ce client.");
        }
    }

    private void openContactPicker(PluginCall call) {
        try {
            Intent intent = new Intent(Intent.ACTION_PICK, ContactsContract.CommonDataKinds.Phone.CONTENT_TYPE);
            startActivityForResult(call, intent, "contactPickerResult");
        } catch (ActivityNotFoundException e) {
            try {
                Intent fallback = new Intent(Intent.ACTION_PICK, ContactsContract.Contacts.CONTENT_URI);
                startActivityForResult(call, fallback, "contactPickerResult");
            } catch (Exception ex) {
                call.reject("Impossible d’ouvrir vos contacts. Vérifiez les autorisations de l’application puis réessayez.");
            }
        } catch (Exception e) {
            call.reject("Impossible d’ouvrir vos contacts : " + e.getMessage());
        }
    }

    @ActivityCallback
    private void contactPickerResult(PluginCall call, ActivityResult result) {
        if (result == null || result.getResultCode() == Activity.RESULT_CANCELED) {
            JSObject ret = new JSObject();
            ret.put("cancelled", true);
            ret.put("success", false);
            call.resolve(ret);
            return;
        }

        if (result.getResultCode() != Activity.RESULT_OK) {
            call.reject("Sélection annulée ou erreur.");
            return;
        }

        Intent data = result.getData();
        if (data == null || data.getData() == null) {
            call.reject("Aucun contact sélectionné.");
            return;
        }

        Uri contactUri = data.getData();
        ContentResolver cr = getContext().getContentResolver();

        String displayName = "";
        String selectedPhone = "";
        long contactId = -1;
        List<String> allPhones = new ArrayList<>();

        // 1. Lire la sélection retournée par le sélecteur Android
        try (Cursor cursor = cr.query(contactUri, null, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                int nameIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME);
                if (nameIdx != -1) {
                    displayName = cursor.getString(nameIdx);
                }
                if (displayName == null || displayName.trim().isEmpty()) {
                    int altNameIdx = cursor.getColumnIndex(ContactsContract.Contacts.DISPLAY_NAME);
                    if (altNameIdx != -1) {
                        displayName = cursor.getString(altNameIdx);
                    }
                }

                int phoneIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER);
                if (phoneIdx != -1) {
                    selectedPhone = cursor.getString(phoneIdx);
                }

                int idIdx = cursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.CONTACT_ID);
                if (idIdx != -1) {
                    contactId = cursor.getLong(idIdx);
                } else {
                    int rawIdIdx = cursor.getColumnIndex(ContactsContract.Contacts._ID);
                    if (rawIdIdx != -1) {
                        contactId = cursor.getLong(rawIdIdx);
                    }
                }
            }
        } catch (Exception e) {
            // Poursuivre avec les données déjà récupérées
        }

        if (selectedPhone != null && !selectedPhone.trim().isEmpty()) {
            allPhones.add(selectedPhone.trim());
        }

        String givenName = "";
        String familyName = "";

        // 2. Si contactId est valide, récupérer les numéros supplémentaires et le nom structuré
        if (contactId > 0) {
            try (Cursor phonesCursor = cr.query(
                ContactsContract.CommonDataKinds.Phone.CONTENT_URI,
                new String[] { ContactsContract.CommonDataKinds.Phone.NUMBER },
                ContactsContract.CommonDataKinds.Phone.CONTACT_ID + " = ?",
                new String[] { String.valueOf(contactId) },
                null
            )) {
                if (phonesCursor != null) {
                    int col = phonesCursor.getColumnIndex(ContactsContract.CommonDataKinds.Phone.NUMBER);
                    if (col != -1) {
                        while (phonesCursor.moveToNext()) {
                            String p = phonesCursor.getString(col);
                            if (p != null && !p.trim().isEmpty()) {
                                String clean = p.trim();
                                if (!allPhones.contains(clean)) {
                                    allPhones.add(clean);
                                }
                            }
                        }
                    }
                }
            } catch (Exception ignored) {}

            try (Cursor nameCursor = cr.query(
                ContactsContract.Data.CONTENT_URI,
                new String[] {
                    ContactsContract.CommonDataKinds.StructuredName.GIVEN_NAME,
                    ContactsContract.CommonDataKinds.StructuredName.FAMILY_NAME
                },
                ContactsContract.Data.CONTACT_ID + " = ? AND " + ContactsContract.Data.MIMETYPE + " = ?",
                new String[] {
                    String.valueOf(contactId),
                    ContactsContract.CommonDataKinds.StructuredName.CONTENT_ITEM_TYPE
                },
                null
            )) {
                if (nameCursor != null && nameCursor.moveToFirst()) {
                    int gCol = nameCursor.getColumnIndex(ContactsContract.CommonDataKinds.StructuredName.GIVEN_NAME);
                    int fCol = nameCursor.getColumnIndex(ContactsContract.CommonDataKinds.StructuredName.FAMILY_NAME);
                    if (gCol != -1) {
                        String g = nameCursor.getString(gCol);
                        if (g != null) givenName = g.trim();
                    }
                    if (fCol != -1) {
                        String f = nameCursor.getString(fCol);
                        if (f != null) familyName = f.trim();
                    }
                }
            } catch (Exception ignored) {}
        }

        JSObject response = new JSObject();
        response.put("success", true);
        response.put("cancelled", false);
        response.put("displayName", displayName != null ? displayName.trim() : "");
        response.put("givenName", givenName);
        response.put("familyName", familyName);
        response.put("selectedPhone", selectedPhone != null ? selectedPhone.trim() : "");

        JSArray phonesArray = new JSArray();
        for (String ph : allPhones) {
            phonesArray.put(ph);
        }
        response.put("phones", phonesArray);

        call.resolve(response);
    }
}
