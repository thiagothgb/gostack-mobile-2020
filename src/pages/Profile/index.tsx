import React, { useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Form } from '@unform/mobile';
import { useNavigation } from '@react-navigation/native';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { FormHandles } from '@unform/core';
import * as Yup from 'yup';
import getValidationErrors from '../../utils/getValidationErrors';
import api from '../../services/api';
import { useAuth } from '../../hooks/auth';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Feather';
import RNImagePicker from 'react-native-image-picker';
import {
  Container,
  Title,
  UserAvatarButton,
  UserAvatar,
  BackButton,
} from './styles';

interface ProfileFormData {
  name: string;
  email: string;
  old_password: string;
  password: string;
  password_confirmation: string;
}
const Profile: React.FC = () => {
  const navigation = useNavigation();
  const { user, updateUser } = useAuth();
  const { goBack } = useNavigation();
  const formRef = useRef<FormHandles>(null);
  const emailRef = useRef<TextInput>(null);
  const oldPasswordRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const passwordConfirmationRef = useRef<TextInput>(null);

  const handleSubmit = useCallback(
    async (data: ProfileFormData) => {
      console.log(data);
      formRef.current?.setErrors({});

      try {
        const schema = Yup.object().shape({
          name: Yup.string().required('Nome obrigatório'),
          email: Yup.string()
            .required('E-mail obrigatório')
            .email('Digite um email válido'),
          old_password: Yup.string(),
          password: Yup.string().when('old_password', {
            is: val => !!val.length,
            then: Yup.string().min(
              6,
              'A senha deve ter no mínimo 6 caracteres',
            ),
            otherwise: Yup.string(),
          }),
          password_confirmation: Yup.string()
            .when('old_password', {
              is: val => !!val.length,
              then: Yup.string().min(
                6,
                'A senha deve ter no mínimo 6 caracteres',
              ),
              otherwise: Yup.string(),
            })
            .oneOf([Yup.ref('password')], 'As senhas devem ser iguais'),
        });

        await schema.validate(data, {
          abortEarly: false,
        });

        const {
          name,
          email,
          password,
          password_confirmation,
          old_password,
        } = data;

        const formData = {
          name,
          email,
          ...(old_password
            ? {
                old_password,
                password,
                password_confirmation,
              }
            : {}),
        };

        const response = await api.put('/profile', formData);

        await updateUser(response.data);

        Alert.alert('Perfil atualizado com sucesso!');

        navigation.goBack();
      } catch (err) {
        if (err instanceof Yup.ValidationError) {
          console.log(getValidationErrors(err));
          formRef.current?.setErrors(getValidationErrors(err));
          return;
        }
        Alert.alert(
          'Erro ao atualizar',
          'Ocorreu um erro ao atualizar o cadastro, tente novamente',
        );
      }
    },
    [navigation, updateUser],
  );

  const handleGoBack = useCallback(() => {
    goBack();
  }, [goBack]);

  const handleUpdateAvatar = useCallback(() => {
    RNImagePicker.showImagePicker(
      {
        title: 'Selecione um avatar',
        cancelButtonTitle: 'Cancelar',
        takePhotoButtonTitle: 'User câmera',
        chooseFromLibraryButtonTitle: 'Escolher da galeria',
      },
      response => {
        if (response.didCancel) {
          return;
        }

        if (response.error) {
          console.log(response.error);
          Alert.alert('Erro ao atualizar seu avatar');
          return;
        }

        const data = new FormData();

        data.append('avatar', {
          uri: response.uri,
          type: 'image/jpeg',
          name: `${user.id}.jpg`,
        });

        api
          .patch('users/avatar', data)
          .then(response => {
            updateUser(response.data);
          })
          .catch(() => {
            Alert.alert(
              'Não foi possível atualizar o seu avatar, tente novamente',
            );
          });
      },
    );
  }, []);

  return (
    <>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled
      >
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView keyboardShouldPersistTaps="handled">
            <Container>
              <BackButton onPress={handleGoBack}>
                <Icon name="chevron-left" size={24} color="#999591" />
              </BackButton>

              <UserAvatarButton onPress={handleUpdateAvatar}>
                <UserAvatar source={{ uri: user.avatar_url }} />
              </UserAvatarButton>
              <View>
                <Title>Meu Perfil</Title>
              </View>
              <Form initialData={user} ref={formRef} onSubmit={handleSubmit}>
                <Input
                  autoCorrect
                  name="name"
                  icon="user"
                  placeholder="Nome"
                  returnKeyType="next"
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
                <Input
                  ref={emailRef}
                  autoCorrect={false}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  name="email"
                  icon="mail"
                  placeholder="E-mail"
                  returnKeyType="next"
                  onSubmitEditing={() => oldPasswordRef.current?.focus()}
                />

                <Input
                  ref={oldPasswordRef}
                  name="old_password"
                  icon="lock"
                  placeholder="Senha Atual"
                  secureTextEntry
                  returnKeyType="send"
                  textContentType="newPassword"
                  containerStyle={{ marginTop: 16 }}
                  onSubmitEditing={() => {
                    passwordRef.current?.focus();
                  }}
                />

                <Input
                  ref={passwordRef}
                  name="password"
                  icon="lock"
                  placeholder="Nova senha"
                  secureTextEntry
                  returnKeyType="send"
                  textContentType="newPassword"
                  onSubmitEditing={() => {
                    passwordConfirmationRef.current?.focus();
                  }}
                />

                <Input
                  ref={passwordConfirmationRef}
                  name="password_confirmation"
                  icon="lock"
                  placeholder="Confirmação de senha"
                  secureTextEntry
                  returnKeyType="send"
                  textContentType="newPassword"
                  onSubmitEditing={() => {
                    formRef.current?.submitForm();
                  }}
                />
              </Form>
              <Button onPress={() => formRef.current?.submitForm()}>
                Confirmar mudanças
              </Button>
            </Container>
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </>
  );
};

export default Profile;
